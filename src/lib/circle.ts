"use client";
import { createClient } from "@/lib/supabase/client";
import type { CareCircle } from "@/lib/types";

/** Returns the current user's first care circle, or null in demo mode. */
export async function getMyCircle(): Promise<CareCircle | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: mem } = await sb.from("circle_members").select("circle_id").eq("user_id", user.id).limit(1).maybeSingle();
  const cid = mem?.circle_id;
  if (!cid) {
    const { data: owned } = await sb.from("care_circles").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
    return (owned as CareCircle) ?? null;
  }
  const { data } = await sb.from("care_circles").select("*").eq("id", cid).maybeSingle();
  return (data as CareCircle) ?? null;
}

/** Logs an event to the circle (no-op in demo mode). */
export async function logEvent(circleId: string | null, type: string, message: string) {
  const sb = createClient();
  if (!sb || !circleId) return;
  await sb.from("care_events").insert({ circle_id: circleId, type, message });
}

/** Fires an SOS: logs it and pushes to every family member. Safe in demo mode. */
export async function fireSOS(circleId: string | null) {
  await logEvent(circleId, "sos", "어머니가 SOS 버튼을 눌렀어요");
  try {
    await fetch("/api/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        circle_id: circleId,
        title: "🚨 긴급 SOS — 부모님",
        body: "어머니가 SOS를 누르셨어요. 지금 바로 확인해주세요.",
        url: "/family",
      }),
    });
  } catch {}
}
