"use client";
import { createClient } from "@/lib/supabase/client";

export interface WeeklyReport {
  medTaken: number; medExpected: number; medRate: number;
  checkins: number; meals: number; sos: number; silence: number;
  voices: number; photos: number; totalEvents: number; activeDays: number;
}

/** Aggregates the last 7 days into a gentle "안심 요약". */
export async function getWeeklyReport(circleId: string): Promise<WeeklyReport | null> {
  const sb = createClient();
  if (!sb) return null;
  const since = new Date(Date.now() - 7 * 86400_000);
  const sinceISO = since.toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const [medsRes, evRes, voiceRes, mediaRes] = await Promise.all([
    sb.from("med_logs").select("taken_at, log_date").eq("circle_id", circleId).gte("log_date", sinceDate),
    sb.from("care_events").select("type, created_at").eq("circle_id", circleId).gte("created_at", sinceISO),
    sb.from("voice_messages").select("id").eq("circle_id", circleId).gte("created_at", sinceISO),
    sb.from("media_items").select("id").eq("circle_id", circleId).is("taken_down_at", null).gte("created_at", sinceISO),
  ]);

  const meds = (medsRes.data ?? []) as { taken_at: string | null }[];
  const medTaken = meds.filter((m) => m.taken_at).length;
  const medExpected = 21; // 3 doses × 7 days (기준)
  const ev = (evRes.data ?? []) as { type: string; created_at: string }[];
  const cnt = (t: string) => ev.filter((e) => e.type === t).length;
  const activeDays = new Set(ev.map((e) => e.created_at.slice(0, 10))).size;

  return {
    medTaken, medExpected, medRate: Math.min(100, Math.round((medTaken / medExpected) * 100)),
    checkins: cnt("checkin"), meals: cnt("meal"), sos: cnt("sos"), silence: cnt("silence"),
    voices: (voiceRes.data ?? []).length, photos: (mediaRes.data ?? []).length,
    totalEvents: ev.length, activeDays,
  };
}
