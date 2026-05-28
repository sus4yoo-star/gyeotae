import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  // gather every member's subscriptions for this circle
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("circle_id", circle_id);

  const payload = JSON.stringify({ title: title || "곁에 알림", body: body || "", url: url || "/family" });
  const results = await Promise.allSettled(
    (subs || []).map((s: any) => webpush.sendNotification(s.subscription, payload))
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent });
}
