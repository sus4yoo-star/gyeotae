"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type VitalKind = "bp" | "glucose";
export interface Vital {
  id: string; circle_id: string; kind: VitalKind;
  systolic: number | null; diastolic: number | null; pulse: number | null;
  value: number | null; tag: string | null; measured_at: string; created_by: string | null;
}

export async function addBP(circleId: string, systolic: number, diastolic: number, pulse?: number | null) {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("vitals").insert({ circle_id: circleId, kind: "bp", systolic, diastolic, pulse: pulse ?? null, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function addGlucose(circleId: string, value: number, tag?: string | null) {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("vitals").insert({ circle_id: circleId, kind: "glucose", value, tag: tag ?? null, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function deleteVital(id: string) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("vitals").delete().eq("id", id);
}

export function useVitals(circleId: string | null | undefined, kind: VitalKind) {
  const [items, setItems] = useState<Vital[]>([]);
  const reload = useCallback(async () => {
    if (!circleId) { setItems([]); return; }
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.from("vitals").select("*")
      .eq("circle_id", circleId).eq("kind", kind).order("measured_at", { ascending: false }).limit(60);
    setItems((data as Vital[]) ?? []);
  }, [circleId, kind]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return { items, reload };
}

/** Simple status band for a single reading. */
export function bpStatus(sys: number, dia: number): { label: string; tone: "ok" | "warn" | "high" } {
  if (sys >= 140 || dia >= 90) return { label: "높음", tone: "high" };
  if (sys >= 130 || dia >= 85) return { label: "주의", tone: "warn" };
  return { label: "정상", tone: "ok" };
}
export function glucoseStatus(v: number, tag?: string | null): { label: string; tone: "ok" | "warn" | "high" } {
  const fasting = tag !== "식후";
  if (fasting ? v >= 126 : v >= 200) return { label: "높음", tone: "high" };
  if (fasting ? v >= 100 : v >= 140) return { label: "주의", tone: "warn" };
  return { label: "정상", tone: "ok" };
}
