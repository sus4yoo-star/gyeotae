import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import webpush from "web-push";

/** Sends a push notification to every family member in a circle.
 *  Used by the SOS button so the WHOLE family is alerted at once. */
export async function POST(req: NextRequest) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ ok: false, demo: true });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@amov.app", pub, priv);

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false, demo: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { circle_id, title, body, url } = await req.json();
  if (!circle_id) {
    return NextResponse.json({ ok: false, error: "missing circle_id" }, { status: 400 });
  }

  // Reading every member's subscription requires bypassing the "own push" RLS
  // policy, so use the service-role client when it's configured.
  const admin = createAdminClient();
  const reader = admin ?? supabase;

  // Anti-abuse: only a member (or the owner) of this circle may broadcast to it.
  const [{ data: membership }, { data: circle }] = await Promise.all([
    reader.from("circle_members").select("id").eq("circle_id", circle_id).eq("user_id", user.id).maybeSingle(),
    reader.from("care_circles").select("owner_id").eq("id", circle_id).maybeSingle(),
  ]);
  if (!membership && circle?.owner_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // gather every member's subscriptions for this circle
  const { data: subs } = await reader
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("circle_id", circle_id);

  const payload = JSON.stringify({ title: title || "곁에 알림", body: body || "", url: url || "/family" });
  const results = await Promise.allSettled(
    (subs || []).map((s: any) => webpush.sendNotification(s.subscription, payload))
  );

  // Prune subscriptions the push service has expired (404/410) so we don't
  // keep retrying dead endpoints on every alert. Only possible with admin access.
  if (admin) {
    const stale = results
      .map((r, i) => (r.status === "rejected" && [404, 410].includes((r.reason as any)?.statusCode) ? subs?.[i]?.id : null))
      .filter(Boolean);
    if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent });
}
