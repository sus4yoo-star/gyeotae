"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Send, Loader2, Users, Lock, Trash2, Video } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCircleState, useCircleMembers } from "@/lib/circle";
import { useParentMode } from "@/lib/device";
import { ensureChannels, useMessages, sendMessage, recallMessage, ChannelType } from "@/lib/chat";
import { requestStartCall } from "@/lib/call";

export default function ChatPage() {
  const { circle, status } = useCircleState();
  const [parentMode] = useParentMode();
  const { members, meId } = useCircleMembers(circle?.id);
  const [channels, setChannels] = useState<Record<ChannelType, string> | null>(null);
  const [tab, setTab] = useState<ChannelType>("family");
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!circle?.id) return;
    ensureChannels(circle.id).then(setChannels).catch(() => {});
  }, [circle?.id]);

  // Parent device only ever sees the whole-family channel.
  const activeTab: ChannelType = parentMode ? "family" : tab;
  const channelId = channels?.[activeTab] ?? null;
  const { items } = useMessages(channelId);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items.length]);

  const nameOf = useMemo(() => (uid: string | null) =>
    members.find((m) => m.user_id === uid)?.display_name || "가족", [members]);

  const send = async () => {
    if (!channelId || !circle?.id || !text.trim()) return;
    const body = text;
    setText("");
    await sendMessage(channelId, circle.id, body);
  };

  if (status === "loading") {
    return (<><main className="gt-aurora flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></main><BottomNav /></>);
  }

  if (status === "demo") {
    return (
      <>
        <main className="gt-aurora relative flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative z-10 max-w-sm">
            <h1 className="font-serif text-2xl font-bold text-gt-ink">가족과 대화하기</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-gt-muted">로그인하면 온 가족, 그리고 자녀끼리 대화할 수 있어요.</p>
            <Link href="/login" className="mt-5 inline-block rounded-2xl bg-gt-coral px-6 py-3 font-semibold text-white">로그인</Link>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden bg-gt-cream">
        {/* channel tabs */}
        <header className="shrink-0 border-b border-gt-line bg-gt-cream/95 px-4 pt-3 pb-2 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display italic text-[11px] tracking-[0.14em] text-gt-terra">— 가족 대화 —</p>
            <button onClick={requestStartCall} className="flex items-center gap-1 rounded-full bg-gt-sage px-3 py-1.5 text-xs font-semibold text-white active:scale-95">
              <Video className="h-3.5 w-3.5" /> 영상통화
            </button>
          </div>
          {parentMode ? (
            <div className="flex items-center gap-1.5 text-gt-ink"><Users className="h-4 w-4 text-gt-coral" /><span className="font-serif text-base">온 가족</span></div>
          ) : (
            <div className="flex gap-2">
              <TabBtn active={activeTab === "family"} onClick={() => setTab("family")} icon={<Users className="h-3.5 w-3.5" />} label="온 가족" />
              <TabBtn active={activeTab === "caregivers"} onClick={() => setTab("caregivers")} icon={<Lock className="h-3.5 w-3.5" />} label="자녀끼리" />
            </div>
          )}
          {!parentMode && activeTab === "caregivers" && (
            <p className="mt-1.5 text-[11px] leading-snug text-gt-muted">부모님께는 보이지 않는 보호자 전용 공간이에요. 돌봄을 조율하거나 깜짝 준비를 나눠보세요.</p>
          )}
        </header>

        {/* messages */}
        <div className="flex-1 overflow-y-auto gt-scroll px-4 py-4">
          {!channelId ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gt-coral" /></div>
          ) : items.length === 0 ? (
            <p className="mt-10 text-center text-sm leading-relaxed text-gt-muted">아직 대화가 없어요.<br />첫 마디를 남겨보세요 💬</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((m) => {
                const mine = m.author === meId;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && <span className="mb-0.5 px-1 text-[11px] text-gt-muted">{nameOf(m.author)}</span>}
                    <div className={`group flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[78vw] rounded-2xl px-3.5 py-2 text-[15px] leading-snug sm:max-w-xs ${
                        m.recalled_at ? "bg-gt-paper2 italic text-gt-mutedLight" : mine ? "bg-gt-coral text-white" : "bg-white text-gt-ink"}`}>
                        {m.recalled_at ? "삭제된 메시지예요" : m.body}
                      </div>
                      <span className="mb-0.5 text-[10px] text-gt-mutedLight">{hhmm(m.created_at)}</span>
                      {mine && !m.recalled_at && (
                        <button onClick={() => recallMessage(m.id)} title="삭제" className="mb-1 hidden h-5 w-5 items-center justify-center rounded-full bg-gt-paper2 text-gt-muted group-hover:flex">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-gt-line bg-gt-cream p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1} placeholder="메시지 입력…"
              className="max-h-28 flex-1 resize-none rounded-2xl border border-gt-line bg-white px-4 py-2.5 font-serif text-[15px] outline-none focus:border-gt-coral"
            />
            <button onClick={send} disabled={!text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gt-coral text-white disabled:opacity-40">
              <Send className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}>
      {icon} {label}
    </button>
  );
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
