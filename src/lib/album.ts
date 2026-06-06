"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logEvent } from "@/lib/circle";

export type Visibility = "family" | "caregivers" | "private";
export interface MediaItem {
  id: string; circle_id: string; uploader: string | null;
  storage_path: string; kind: "image" | "video"; visibility: Visibility;
  caption: string | null; created_at: string; taken_down_at: string | null;
}

export const VIS_LABEL: Record<Visibility, string> = {
  family: "온 가족", caregivers: "자녀끼리", private: "나만 보기",
};

export async function uploadMedia(circleId: string, file: File, visibility: Visibility, caption: string): Promise<boolean> {
  const sb = createClient();
  if (!sb) return false;
  const { data: { user } } = await sb.auth.getUser();
  const kind: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
  const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
  const path = `${circleId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return false;
  await sb.from("media_items").insert({
    circle_id: circleId, uploader: user?.id ?? null, storage_path: path, kind, visibility, caption: caption.trim() || null,
  });
  if (visibility !== "private") await logEvent(circleId, "video", kind === "video" ? "새 영상을 공유했어요" : "새 사진을 공유했어요");
  return true;
}

export function useMedia(circleId?: string | null) {
  const [items, setItems] = useState<(MediaItem & { url?: string })[]>([]);
  const reload = useCallback(async () => {
    if (!circleId) { setItems([]); return; }
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.from("media_items").select("*")
      .eq("circle_id", circleId).is("taken_down_at", null).order("created_at", { ascending: false }).limit(100);
    const rows = (data as MediaItem[]) ?? [];
    const withUrls = await Promise.all(rows.map(async (r) => {
      const { data: s } = await sb.storage.from("media").createSignedUrl(r.storage_path, 3600);
      return { ...r, url: s?.signedUrl };
    }));
    setItems(withUrls);
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    reload().catch(() => {});
    const sb = createClient();
    if (!sb) return;
    const ch = sb.channel(`media:${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "media_items", filter: `circle_id=eq.${circleId}` },
        () => reload().catch(() => {}))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [circleId, reload]);

  return { items, reload };
}

export async function takedownMedia(id: string) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("media_items").update({ taken_down_at: new Date().toISOString() }).eq("id", id);
}

export async function setMediaVisibility(id: string, visibility: Visibility) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("media_items").update({ visibility }).eq("id", id);
}
