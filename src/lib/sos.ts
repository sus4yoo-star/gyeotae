"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/circle";

export interface SOSAlert {
  id: string;
  circle_id: string;
  status: "active" | "acknowledged" | "resolved";
  triggered_by: string | null;
  lat: number | null;
  lng: number | null;
  location_text: string | null;
  ack_by: string | null;
  ack_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** Best-effort device location (null if denied/unsupported). */
export async function getLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

async function pushAll(circleId: string, title: string, body: string, url = "/family") {
  try {
    await fetch("/api/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circle_id: circleId, title, body, url }),
    });
  } catch {}
}

/** Fires an SOS: logs it, creates a live alert with location, and pushes the
 *  whole family. Safe in demo mode (still pushes / no-op DB). */
export async function createSOS(circleId: string | null): Promise<SOSAlert | null> {
  await logEvent(circleId, "sos", "어머니가 SOS 버튼을 눌렀어요");
  const sb = createClient();
  if (!sb || !circleId) {
    if (circleId) await pushAll(circleId, "🚨 긴급 SOS — 부모님", "어머니가 SOS를 누르셨어요. 지금 바로 확인해주세요.");
    return null;
  }
  const loc = await getLocation();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("sos_alerts").insert({
    circle_id: circleId, triggered_by: user?.id ?? null,
    lat: loc?.lat ?? null, lng: loc?.lng ?? null,
  }).select("*").maybeSingle();
  await pushAll(circleId, "🚨 긴급 SOS — 부모님", "어머니가 SOS를 누르셨어요. 지금 바로 확인해주세요.");
  return (data as SOSAlert) ?? null;
}

/** A family member responds "I'm on my way" — acknowledges the alert. */
export async function ackSOS(alert: SOSAlert, myName: string) {
  const sb = createClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  await sb.from("sos_alerts")
    .update({ status: "acknowledged", ack_by: user?.id ?? null, ack_at: new Date().toISOString() })
    .eq("id", alert.id).eq("status", "active");
  await pushAll(alert.circle_id, "✅ SOS 확인됨", `${myName} 님이 "지금 갈게요"라고 응답했어요.`);
}

export async function resolveSOS(alert: SOSAlert) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("sos_alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", alert.id);
}

/** Live latest unresolved SOS for a circle (realtime). null in demo mode. */
export function useActiveSOS(circleId?: string | null): { alert: SOSAlert | null; reload: () => void } {
  const [alert, setAlert] = useState<SOSAlert | null>(null);

  const reload = useCallback(async () => {
    if (!circleId) { setAlert(null); return; }
    const sb = createClient();
    if (!sb) { setAlert(null); return; }
    const { data } = await sb.from("sos_alerts").select("*")
      .eq("circle_id", circleId).neq("status", "resolved")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setAlert((data as SOSAlert) ?? null);
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    reload().catch(() => {});
    const sb = createClient();
    if (!sb) return;
    const ch = sb.channel(`sos:${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts", filter: `circle_id=eq.${circleId}` },
        () => reload().catch(() => {}))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [circleId, reload]);

  return { alert, reload };
}

/** Korea: app can't auto-dial 119. Build a location SMS the caller can send. */
export function locationSMS(alert: SOSAlert, parentName: string): string {
  const where = alert.lat && alert.lng
    ? `위치 https://maps.google.com/?q=${alert.lat},${alert.lng}`
    : (alert.location_text || "위치 미상");
  return `[긴급] ${parentName} 님 SOS. ${where}`;
}
