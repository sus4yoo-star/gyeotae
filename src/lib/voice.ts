"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/circle";

export interface VoiceMessage {
  id: string;
  circle_id: string;
  author: string | null;
  storage_path: string;
  duration_sec: number | null;
  created_at: string;
}

/** Uploads a recorded clip to the private `voice` bucket + a row, then pushes. */
export async function uploadVoiceMessage(circleId: string, blob: Blob, durationSec: number): Promise<boolean> {
  const sb = createClient();
  if (!sb) return false;
  const { data: { user } } = await sb.auth.getUser();
  const id = crypto.randomUUID();
  const path = `${circleId}/${id}.webm`;
  const { error: upErr } = await sb.storage.from("voice").upload(path, blob, {
    contentType: blob.type || "audio/webm", upsert: false,
  });
  if (upErr) return false;
  await sb.from("voice_messages").insert({
    circle_id: circleId, author: user?.id ?? null, storage_path: path, duration_sec: Math.round(durationSec),
  });
  await logEvent(circleId, "message", "음성 메시지를 보냈어요");
  try {
    await fetch("/api/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circle_id: circleId, title: "🎙️ 음성 메시지", body: "가족이 음성 메시지를 보냈어요", url: "/family" }),
    });
  } catch {}
  return true;
}

/** Live list of a circle's voice messages with short-lived signed URLs. */
export function useVoiceMessages(circleId?: string | null) {
  const [items, setItems] = useState<(VoiceMessage & { url?: string })[]>([]);

  const reload = useCallback(async () => {
    if (!circleId) { setItems([]); return; }
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.from("voice_messages").select("*")
      .eq("circle_id", circleId).order("created_at", { ascending: false }).limit(20);
    const rows = (data as VoiceMessage[]) ?? [];
    const withUrls = await Promise.all(rows.map(async (r) => {
      const { data: signed } = await sb.storage.from("voice").createSignedUrl(r.storage_path, 3600);
      return { ...r, url: signed?.signedUrl };
    }));
    setItems(withUrls);
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    reload().catch(() => {});
    const sb = createClient();
    if (!sb) return;
    const ch = sb.channel(`voice:${circleId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_messages", filter: `circle_id=eq.${circleId}` },
        () => reload().catch(() => {}))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [circleId, reload]);

  return { items, reload };
}
