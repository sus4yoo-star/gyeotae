"use client";
import { createClient } from "@/lib/supabase/client";

export interface EmergencyContact { name: string; relation: string; phone: string }

export interface MedicalProfile {
  sex: string;
  blood_type: string;
  conditions: string;
  allergies: string;
  medications: string;
  surgeries: string;
  history: string;
  height_cm: number | null;
  weight_kg: number | null;
  doctor: string;
  hospital: string;
  insurance: string;
  emergency_contacts: EmergencyContact[];
  dnr: boolean;
  notes: string;
}

export const EMPTY_MEDICAL: MedicalProfile = {
  sex: "", blood_type: "", conditions: "", allergies: "", medications: "",
  surgeries: "", history: "", height_cm: null, weight_kg: null,
  doctor: "", hospital: "", insurance: "", emergency_contacts: [], dnr: false, notes: "",
};

/** Demo placeholder shown before Supabase is configured / no circle. */
export const DEMO_MEDICAL: MedicalProfile = {
  sex: "여성", blood_type: "A형 Rh+",
  conditions: "고혈압, 당뇨(2형)", allergies: "페니실린, 새우",
  medications: "아침 — 혈압약(암로디핀), 당뇨약(메트포르민)\n저녁 — 콜레스테롤약(아토르바스타틴)",
  surgeries: "2019 무릎 인공관절 (부산대병원)", history: "2015 담낭 절제 · 2021 백내장",
  height_cm: 158, weight_kg: 56, doctor: "박정호 (부산365의원)", hospital: "부산대학교병원",
  insurance: "국민건강보험",
  emergency_contacts: [
    { name: "김미경", relation: "막내딸", phone: "010-1234-5678" },
    { name: "박정호", relation: "주치의", phone: "051-000-0000" },
  ],
  dnr: false, notes: "",
};

function normalize(d: Record<string, unknown>): MedicalProfile {
  const ec = d.emergency_contacts;
  return {
    ...EMPTY_MEDICAL,
    ...d,
    height_cm: (d.height_cm as number) ?? null,
    weight_kg: (d.weight_kg as number) ?? null,
    dnr: !!d.dnr,
    emergency_contacts: Array.isArray(ec) ? (ec as EmergencyContact[]) : [],
  } as MedicalProfile;
}

export async function getMedicalProfile(circleId: string): Promise<MedicalProfile | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data } = await sb.from("medical_profiles").select("*").eq("circle_id", circleId).maybeSingle();
  return data ? normalize(data) : EMPTY_MEDICAL;
}

export async function saveMedicalProfile(circleId: string, p: MedicalProfile) {
  const sb = createClient();
  if (!sb) throw new Error("로그인이 필요해요");
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("medical_profiles").upsert(
    { circle_id: circleId, ...p, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
    { onConflict: "circle_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getEmergencyLink(circleId: string): Promise<{ token: string; enabled: boolean } | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data } = await sb.from("emergency_links").select("token, enabled").eq("circle_id", circleId).maybeSingle();
  return (data as { token: string; enabled: boolean }) ?? null;
}

/** Creates (or re-enables) the public emergency link and returns its token. */
export async function ensureEmergencyLink(circleId: string): Promise<string | null> {
  const sb = createClient();
  if (!sb) return null;
  const existing = await getEmergencyLink(circleId);
  if (existing) {
    if (!existing.enabled) await sb.from("emergency_links").update({ enabled: true }).eq("circle_id", circleId);
    return existing.token;
  }
  const { data, error } = await sb.from("emergency_links").insert({ circle_id: circleId }).select("token").single();
  if (error || !data) return null;
  return (data as { token: string }).token;
}

export async function disableEmergencyLink(circleId: string) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("emergency_links").update({ enabled: false }).eq("circle_id", circleId);
}

/** Anonymous read of an emergency card by token (security-definer RPC). */
export async function fetchEmergencyCard(token: string): Promise<Record<string, unknown> | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data } = await sb.rpc("get_emergency_card", { p_token: token });
  return (data as Record<string, unknown>) ?? null;
}
