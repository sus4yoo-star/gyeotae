"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type OccasionType = "birthday" | "memorial" | "anniversary" | "other";

export interface Occasion {
  id: string; circle_id: string; title: string; type: OccasionType;
  month: number; day: number; is_lunar: boolean; notify_days_before: number;
  created_at: string;
}

export const OCC_META: Record<OccasionType, { label: string; emoji: string }> = {
  birthday: { label: "생신/생일", emoji: "🎂" },
  memorial: { label: "제사/기일", emoji: "🕯️" },
  anniversary: { label: "기념일", emoji: "💐" },
  other: { label: "기타", emoji: "📌" },
};

export function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(now.getFullYear(), month - 1, day);
  if (d < today) d = new Date(now.getFullYear() + 1, month - 1, day);
  return d;
}

export function daysUntil(month: number, day: number): number {
  const d = nextOccurrence(month, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400_000);
}

export async function addOccasion(circleId: string, o: {
  title: string; type: OccasionType; month: number; day: number; is_lunar: boolean; notify_days_before: number;
}) {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("occasions").insert({ circle_id: circleId, created_by: user?.id ?? null, ...o });
  if (error) throw new Error(error.message);
}

export async function deleteOccasion(id: string) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("occasions").delete().eq("id", id);
}

export function useOccasions(circleId?: string | null) {
  const [items, setItems] = useState<Occasion[]>([]);
  const reload = useCallback(async () => {
    if (!circleId) { setItems([]); return; }
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.from("occasions").select("*").eq("circle_id", circleId);
    const rows = (data as Occasion[]) ?? [];
    rows.sort((a, b) => daysUntil(a.month, a.day) - daysUntil(b.month, b.day));
    setItems(rows);
  }, [circleId]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return { items, reload };
}
