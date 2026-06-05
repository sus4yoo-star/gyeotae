"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Mic, Send } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

type Msg = { role: "user" | "assistant"; content: string };

const SIM = [
  "어머니, 안녕히 주무셨어요? 어젯밤은 푹 주무셨는지 궁금해요.",
  "다행이에요. 오늘 아침 기분은 좀 어떠세요?",
  "그러시군요. 아침 식사는 하셨어요? 거르지 마시고 꼭 챙겨 드셔야 해요.",
  "잘하셨어요. 혈압약은 드셨는지도 여쭤봐도 될까요?",
  "오늘 어디 나가실 계획은 있으세요? 비가 온다고 하니 우산 챙기시면 좋겠어요.",
  "네 어머니, 오늘도 평안한 하루 보내세요. 막내따님이 음성 메시지를 보내두셨으니 이따 꼭 들어보세요. 사랑받고 계신 거 잊지 마시고요. 💛",
];
const CHIPS = [["잘 잤어요", "어제 잠을 설쳤네"], ["기분 좋아요", "조금 외롭네"], ["아침 먹었어요", "아직 안 먹었어요"], ["약 먹었어요", "깜빡했네"], ["교회 가요", "집에 있을래요"], []];

export default function CallPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [turn, setTurn] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const simStep = useRef(0);
  const convo = useRef<Msg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [msgs, typing]);
  // Kick off the opening greeting once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(start, 700); return () => clearTimeout(t); }, []);

  async function callApi(payload: any): Promise<string | null> {
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (d.simulate) { setSimMode(true); return null; }
      return d.text as string;
    } catch { setSimMode(true); return null; }
  }

  async function aiReply() {
    setTyping(true);
    let reply = await callApi({ messages: convo.current });
    if (!reply) {
      await new Promise((r) => setTimeout(r, 850));
      reply = SIM[Math.min(simStep.current, SIM.length - 1)];
      simStep.current++;
    }
    setTyping(false);
    convo.current = [...convo.current, { role: "assistant", content: reply }];
    setMsgs((m) => [...m, { role: "assistant", content: reply }]);
  }

  async function start() {
    convo.current = [{ role: "user", content: "(전화 연결됨 - 안부 인사를 시작해주세요)" }];
    await aiReply();
  }

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || typing) return;
    setInput("");
    convo.current = [...convo.current, { role: "user", content: t }];
    setMsgs((m) => [...m, { role: "user", content: t }]);
    setTurn((x) => x + 1);
    await aiReply();
  }

  async function endCall() {
    setSummaryLoading(true);
    setSummary({ loading: true });
    let result: any = null;
    const raw = await callApi({ messages: [...convo.current, { role: "user", content: "요약해주세요" }], summary: true });
    if (raw) { try { result = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {} }
    if (!result) {
      result = {
        mood_emoji: "😊", mood_label: "평안하세요", mood_sub: "오늘 컨디션이 좋으십니다",
        highlights: ["어젯밤 잘 주무셨어요", "아침 식사를 하셨어요", "혈압약 복용을 확인했어요", "오후에 교회 가실 계획이에요"],
        flags: ["비 예보가 있어 우산을 챙기시도록 안내했어요"],
      };
    }
    setSummary(result);
    setSummaryLoading(false);
  }

  const chips = CHIPS[Math.min(turn, CHIPS.length - 1)] || [];

  return (
    <>
      <main className="gt-aurora relative flex flex-1 flex-col overflow-hidden">
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          {simMode && (
            <div className="border-b border-gt-gold/40 bg-gt-goldSoft px-4 py-2 text-center text-[11px] leading-snug text-gt-terra">
              🎙️ <strong>AI 모닝콜 데모 (시뮬레이션)</strong> — 실제 출시 버전은 음성으로 대화합니다
            </div>
          )}
          {/* Header */}
          <header className="border-b border-gt-line px-6 pb-4 pt-5" style={{ background: "linear-gradient(180deg,#FBEEE0,transparent)" }}>
            <p className="font-display italic text-[11px] tracking-[0.1em] text-gt-terra">AI MORNING CALL · 오늘의 안부</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-lg shadow-gt-coral/30">
                <Heart className="h-6 w-6 text-white" fill="white" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-gt-cream bg-gt-sage" />
              </div>
              <div>
                <p className="font-serif text-lg font-bold text-gt-ink">곁에 도우미</p>
                <p className="flex items-center gap-1.5 text-xs text-gt-sage"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-gt-sage" />이옥자 어머니와 통화 중</p>
              </div>
            </div>
          </header>

          {/* Chat */}
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto gt-scroll px-5 py-6">
            {msgs.map((m, i) => (
              <div key={i} className={`flex items-end gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`} style={{ maxWidth: "88%", marginLeft: m.role === "user" ? "auto" : 0 }}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-xs font-bold text-white ${m.role === "user" ? "bg-gt-sage" : "bg-gradient-to-br from-gt-coral to-gt-gold"}`}>
                  {m.role === "user" ? "옥자" : <Heart className="h-3.5 w-3.5" fill="white" />}
                </span>
                <div className={`rounded-[20px] px-4 py-3 font-serif text-[16px] leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-gt-sageLight" : "rounded-bl-sm bg-gt-coralSoft"} text-gt-ink`}>
                  {m.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-end gap-2.5" style={{ maxWidth: "88%" }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold"><Heart className="h-3.5 w-3.5 text-white" fill="white" /></span>
                <div className="flex gap-1 rounded-[20px] rounded-bl-sm bg-gt-coralSoft px-4 py-4">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-typing rounded-full bg-gt-coral" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 pb-2">
              {chips.map((c) => (
                <button key={c} onClick={() => send(c)} className="rounded-full border-[1.5px] border-gt-coralLight bg-white px-4 py-2.5 text-sm text-gt-coralDeep active:scale-95 transition-transform">{c}</button>
              ))}
            </div>
          )}

          {/* End call */}
          <div className="px-5 pb-3">
            <button onClick={endCall} className="w-full rounded-2xl border-[1.5px] border-gt-line bg-transparent py-3 text-[13px] text-gt-muted hover:border-gt-coral hover:text-gt-coral transition-colors">
              안부 마치고 가족에게 전하기 →
            </button>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2.5 border-t border-gt-line bg-gt-cream px-4 py-3.5">
            <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gt-paper2 text-gt-muted" title="실제 앱은 음성으로 대화합니다"><Mic className="h-5 w-5" /></button>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="여기에 답해보세요..." className="flex-1 rounded-full border-[1.5px] border-gt-line bg-white px-5 py-3.5 font-serif text-[16px] outline-none focus:border-gt-coral" />
            <button onClick={() => send()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gt-coral text-white"><Send className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Summary overlay */}
        {summary && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm" onClick={() => !summaryLoading && setSummary(null)}>
            <div className="max-h-[90%] w-full max-w-sm overflow-y-auto gt-scroll rounded-[1.75rem] bg-gt-cream p-7" onClick={(e) => e.stopPropagation()}>
              <p className="font-display italic text-xs tracking-[0.1em] text-gt-terra">FAMILY REPORT · 가족에게 전하는 요약</p>
              <p className="font-serif text-[22px] text-gt-ink">오늘 어머니의 안부</p>
              <p className="mb-5 text-[13px] text-gt-muted">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} · 오전 안부</p>
              {summary.loading ? (
                <div className="py-10 text-center text-gt-muted">
                  <div className="mx-auto mb-4 flex w-fit gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-typing rounded-full bg-gt-coral" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
                  AI가 오늘 대화를 정리하고 있어요...
                </div>
              ) : (
                <>
                  <div className="gt-card mb-3 p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-4xl">{summary.mood_emoji}</span>
                      <div><p className="font-serif text-[17px] text-gt-ink">{summary.mood_label}</p><p className="text-xs text-gt-muted">{summary.mood_sub}</p></div>
                    </div>
                    <p className="mb-2 font-display italic text-[11px] tracking-wide text-gt-muted">오늘 확인된 사항</p>
                    {summary.highlights?.map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 py-1.5 text-sm leading-snug"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gt-coralLight text-xs text-gt-coralDeep">✓</span><span>{h}</span></div>
                    ))}
                  </div>
                  {summary.flags?.length > 0 && (
                    <div className="mb-3 rounded-2xl border border-gt-danger/25 bg-gt-dangerSoft/40 p-5">
                      <p className="mb-2 font-display italic text-[11px] text-gt-muted">⚠ 신경 써주세요</p>
                      {summary.flags.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 py-1.5 text-sm leading-snug"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gt-dangerSoft text-xs text-gt-danger">!</span><span>{f}</span></div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSummary(null)} className="mt-1 w-full rounded-2xl bg-gt-ink py-4 font-semibold text-gt-cream">가족 단톡방에 전하기</button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
