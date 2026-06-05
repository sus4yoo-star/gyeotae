"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CareCircle } from "@/lib/types";
import type { TakenMap, DoseId } from "@/components/medication-tracker";

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

/** React hook: loads the current user's circle once. null in demo mode. */
export function useMyCircle(): CareCircle | null {
  const [circle, setCircle] = useState<CareCircle | null>(null);
  useEffect(() => { let live = true; getMyCircle().then((c) => { if (live) setCircle(c); }).catch(() => {}); return () => { live = false; }; }, []);
  return circle;
}

/** Logs an event to the circle (no-op in demo mode). */
export async function logEvent(circleId: string | null, type: string, message: string) {
  const sb = createClient();
  if (!sb || !circleId) return;
  await sb.from("care_events").insert({ circle_id: circleId, type, message });
}

/** Today's date as YYYY-MM-DD (local), matching the med_logs.log_date column. */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Reads today's medication state for a circle from the DB so parent and child
 *  devices stay in sync. Returns null in demo mode (caller falls back to
 *  localStorage). */
export async function readMedsRemote(circleId: string): Promise<TakenMap | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("med_logs").select("dose, taken_at")
    .eq("circle_id", circleId).eq("log_date", todayISO());
  if (error || !data) return null;
  const map: TakenMap = { morning: null, lunch: null, evening: null };
  for (const row of data as { dose: string; taken_at: string | null }[]) {
    if (row.dose in map) map[row.dose as DoseId] = row.taken_at;
  }
  return map;
}

/** Records (or clears) a single dose for today. No-op in demo mode. */
export async function writeMedRemote(circleId: string, dose: DoseId, takenAt: string | null) {
  const sb = createClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  await sb.from("med_logs").upsert(
    { circle_id: circleId, log_date: todayISO(), dose, taken_at: takenAt, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
    { onConflict: "circle_id,log_date,dose" },
  );
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
