"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChannelType = "family" | "caregivers";
export interface Channel { id: string; type: ChannelType }
export interface ChatMessage {
  id: string; channel_id: string; circle_id: string;
  author: string | null; body: string | null; kind: string;
  created_at: string; recalled_at: string | null;
}

/** Gets (or lazily creates) a circle's two channels. */
export async function ensureChannels(circleId: string): Promise<Record<ChannelType, string> | null> {
  const sb = createClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_or_create_channels", { p_circle: circleId });
  if (error || !data) return null;
  const map: Partial<Record<ChannelType, string>> = {};
  for (const row of data as Channel[]) map[row.type] = row.id;
  if (!map.family || !map.caregivers) return null;
  return map as Record<ChannelType, string>;
}

/** Live messages for a channel (oldest→newest), realtime. */
export function useMessages(channelId?: string | null) {
  const [items, setItems] = useState<ChatMessage[]>([]);

  const reload = useCallback(async () => {
    if (!channelId) { setItems([]); return; }
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.from("messages").select("*")
      .eq("channel_id", channelId).order("created_at", { ascending: true }).limit(200);
    setItems((data as ChatMessage[]) ?? []);
  }, [channelId]);

  useEffect(() => {
    if (!channelId) { setItems([]); return; }
    reload().catch(() => {});
    const sb = createClient();
    if (!sb) return;
    const ch = sb.channel(`msg:${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        () => reload().catch(() => {}))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [channelId, reload]);

  return { items, reload };
}

export async function sendMessage(channelId: string, circleId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  const sb = createClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  await sb.from("messages").insert({ channel_id: channelId, circle_id: circleId, author: user?.id ?? null, body: text });
}

/** Recall (soft-delete) one of your own messages. */
export async function recallMessage(id: string) {
  const sb = createClient();
  if (!sb) return;
  await sb.from("messages").update({ recalled_at: new Date().toISOString(), body: null }).eq("id", id);
}
