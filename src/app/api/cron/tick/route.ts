import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";

/**
 * Scheduled tick (every ~30 min, called by Supabase pg_cron / external cron).
 * 1) Silence detection — alert family if a parent has been inactive too long.
 * 2) SOS escalation — re-alert if an active SOS goes unacknowledged.
 * Protected by the x-cron-secret header (CRON_SECRET env).
 */
export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "service role not configured" }, { status: 500 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const canPush = !!(pub && priv);
  if (canPush) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@amov.app", pub!, priv!);

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600_000); // 한국시간 기준 판단
  const today = kst.toISOString().slice(0, 10);
  let silenceAlerts = 0;
  let escalations = 0;

  // 1) 무응답 감지
  const { data: circles } = await admin.from("care_circles")
    .select("id, parent_name, last_activity_at, silence_threshold_hours, quiet_start, quiet_end, last_silence_alert_date");

  for (const c of circles ?? []) {
    const threshold = c.silence_threshold_hours ?? 12;
    const last = c.last_activity_at ? new Date(c.last_activity_at).getTime() : 0;
    const idleHours = (now.getTime() - last) / 3600_000;
    if (idleHours >= threshold && !inQuietHours(kst, c.quiet_start, c.quiet_end) && c.last_silence_alert_date !== today) {
      await admin.from("care_events").insert({ circle_id: c.id, type: "silence", message: `${c.parent_name || "부모님"} 오늘 아직 활동이 없어요` });
      await admin.from("care_circles").update({ last_silence_alert_date: today }).eq("id", c.id);
      if (canPush) await pushCircle(admin, c.id, "🔕 무응답 알림", `${c.parent_name || "부모님"} 오늘 아직 활동이 없어요. 한번 연락해보세요.`);
      silenceAlerts++;
    }
  }

  // 2) SOS 에스컬레이션 (3분 이상 미확인)
  const cutoff = new Date(now.getTime() - 3 * 60_000).toISOString();
  const { data: stale } = await admin.from("sos_alerts")
    .select("id, circle_id").eq("status", "active").is("escalated_at", null).lt("created_at", cutoff);
  for (const a of stale ?? []) {
    await admin.from("sos_alerts").update({ escalated_at: now.toISOString() }).eq("id", a.id);
    if (canPush) await pushCircle(admin, a.circle_id, "🚨 SOS 미확인 — 긴급", "아직 아무도 확인하지 않았어요. 지금 확인하거나 119에 연락하세요.");
    escalations++;
  }

  // 3) 기념일·제사·생신 알림 (며칠 전, 1년에 한 번)
  let occasionNotices = 0;
  const ky = kst.getUTCFullYear(), km = kst.getUTCMonth() + 1, kd = kst.getUTCDate();
  const todayIdx = km * 100 + kd;
  const todayUTC = Date.UTC(ky, km - 1, kd);
  const { data: occs } = await admin.from("occasions")
    .select("id, circle_id, title, type, month, day, notify_days_before, last_notified_year");
  for (const o of occs ?? []) {
    const occYear = (o.month * 100 + o.day) >= todayIdx ? ky : ky + 1;
    const days = Math.round((Date.UTC(occYear, o.month - 1, o.day) - todayUTC) / 86400_000);
    if (days >= 0 && days <= (o.notify_days_before ?? 3) && o.last_notified_year !== occYear) {
      await admin.from("occasions").update({ last_notified_year: occYear }).eq("id", o.id);
      const emoji = o.type === "memorial" ? "🕯️" : o.type === "birthday" ? "🎂" : "💐";
      const when = days === 0 ? "오늘이에요" : `${days}일 뒤예요`;
      if (canPush) await pushCircle(admin, o.circle_id, `${emoji} ${o.title}`, `${o.title} — ${when}.`);
      occasionNotices++;
    }
  }

  return NextResponse.json({ ok: true, silenceAlerts, escalations, occasionNotices });
}

function inQuietHours(kst: Date, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const cur = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // 자정 넘는 구간 처리
}

async function pushCircle(admin: NonNullable<ReturnType<typeof createAdminClient>>, circleId: string, title: string, body: string) {
  const { data: subs } = await admin.from("push_subscriptions").select("subscription").eq("circle_id", circleId);
  const payload = JSON.stringify({ title, body, url: "/family" });
  await Promise.allSettled((subs ?? []).map((s: { subscription: webpush.PushSubscription }) => webpush.sendNotification(s.subscription, payload)));
}
