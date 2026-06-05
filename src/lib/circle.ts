"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/client";
import type { CareCircle, CareEvent, CircleMember } from "@/lib/types";
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

export type CircleStatus = "loading" | "demo" | "needs-onboarding" | "ready";

/** Richer circle state used by the onboarding gate.
 *  - "demo": Supabase off, or nobody logged in → browse the demo freely.
 *  - "needs-onboarding": logged in but not in any circle yet.
 *  - "ready": logged in and a member of a circle. */
export function useCircleState() {
  const [circle, setCircle] = useState<CareCircle | null>(null);
  const [status, setStatus] = useState<CircleStatus>("loading");

  const reload = useCallback(async () => {
    if (!isSupabaseEnabled()) { setStatus("demo"); return; }
    const sb = createClient();
    if (!sb) { setStatus("demo"); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setStatus("demo"); return; }
    const c = await getMyCircle();
    if (c) { setCircle(c); setStatus("ready"); }
    else { setCircle(null); setStatus("needs-onboarding"); }
  }, []);

  useEffect(() => { reload().catch(() => setStatus("demo")); }, [reload]);
  return { circle, status, reload };
}

/** Creates a new care circle for the current user and makes them its admin.
 *  Returns the circle (with its invite_code) so siblings can be invited. */
export async function createCircle(input: {
  parent_name: string; parent_age?: number | null; parent_location?: string | null;
  display_name?: string; relation?: string;
}): Promise<CareCircle> {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요");

  const { data: circle, error } = await sb.from("care_circles").insert({
    parent_name: input.parent_name,
    parent_age: input.parent_age ?? null,
    parent_location: input.parent_location ?? null,
    owner_id: user.id,
  }).select("*").single();
  if (error || !circle) throw new Error(error?.message || "모임을 만들지 못했어요");

  await sb.from("circle_members").insert({
    circle_id: circle.id, user_id: user.id,
    relation: input.relation || "가족", role: "admin",
    display_name: input.display_name || user.email?.split("@")[0] || "가족",
  });
  return circle as CareCircle;
}

/** Joins an existing circle by its 6-char invite code via a security-definer
 *  RPC (a non-member can't read the circle under RLS otherwise). */
export async function joinCircle(code: string, displayName?: string): Promise<CareCircle> {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: cid, error } = await sb.rpc("join_circle", {
    p_code: code.trim().toLowerCase(),
    p_display_name: displayName?.trim() || null,
  });
  if (error) throw new Error(error.message);
  if (!cid) throw new Error("초대코드를 찾을 수 없어요. 다시 확인해주세요.");
  const { data: circle } = await sb.from("care_circles").select("*").eq("id", cid as string).maybeSingle();
  if (!circle) throw new Error("모임 정보를 불러오지 못했어요");
  return circle as CareCircle;
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

/** Live feed of a circle's recent events. Loads the latest, then subscribes to
 *  realtime INSERTs. Returns null in demo mode (caller shows demo content). */
export function useCircleEvents(circleId?: string | null, limit = 20): CareEvent[] | null {
  const [events, setEvents] = useState<CareEvent[] | null>(null);
  useEffect(() => {
    if (!circleId) { setEvents(null); return; }
    const sb = createClient();
    if (!sb) { setEvents(null); return; }
    let live = true;
    sb.from("care_events").select("*").eq("circle_id", circleId)
      .order("created_at", { ascending: false }).limit(limit)
      .then(({ data }) => { if (live) setEvents((data as CareEvent[]) ?? []); });
    const channel = sb.channel(`care_events:${circleId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "care_events", filter: `circle_id=eq.${circleId}` },
        (payload) => setEvents((cur) => [payload.new as CareEvent, ...(cur ?? [])].slice(0, limit)))
      .subscribe();
    return () => { live = false; sb.removeChannel(channel); };
  }, [circleId, limit]);
  return events;
}

/** A circle's members plus the current user's id (to highlight "me"). */
export function useCircleMembers(circleId?: string | null): { members: CircleMember[]; meId: string | null } {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    if (!circleId) { setMembers([]); setMeId(null); return; }
    const sb = createClient();
    if (!sb) return;
    let live = true;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!live) return;
      setMeId(user?.id ?? null);
      const { data } = await sb.from("circle_members").select("*")
        .eq("circle_id", circleId).order("created_at", { ascending: true });
      if (live) setMembers((data as CircleMember[]) ?? []);
    })();
    return () => { live = false; };
  }, [circleId]);
  return { members, meId };
}
