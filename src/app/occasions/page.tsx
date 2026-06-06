"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, X, CalendarHeart } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCircleState } from "@/lib/circle";
import { useOccasions, addOccasion, deleteOccasion, daysUntil, OCC_META, OccasionType } from "@/lib/occasions";

export default function OccasionsPage() {
  const { circle, status } = useCircleState();
  const { items, reload } = useOccasions(circle?.id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<OccasionType>("birthday");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [lunar, setLunar] = useState(false);
  const [before, setBefore] = useState(3);

  const save = async () => {
    if (!circle?.id || !title.trim() || !month || !day) return;
    setBusy(true);
    try {
      await addOccasion(circle.id, { title: title.trim(), type, month: Number(month), day: Number(day), is_lunar: lunar, notify_days_before: before });
      setOpen(false); setTitle(""); setMonth(""); setDay(""); setLunar(false); setType("birthday"); setBefore(3);
      reload();
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  if (status === "loading") return (<><main className="gt-aurora flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></main><BottomNav /></>);
  if (status === "demo") return (
    <><main className="gt-aurora flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-bold text-gt-ink">기념일·제사</h1>
      <p className="mt-2 text-[15px] text-gt-muted">로그인하면 가족의 기념일을 등록하고 미리 알림받아요.</p>
      <Link href="/login" className="mt-5 rounded-2xl bg-gt-coral px-6 py-3 font-semibold text-white">로그인</Link>
    </main><BottomNav /></>
  );

  return (
    <>
      <main className="flex-1 overflow-y-auto gt-scroll bg-gt-cream">
        <header className="flex items-center justify-between border-b border-gt-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/family" className="flex h-8 w-8 items-center justify-center rounded-full bg-gt-paper2"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="font-serif text-lg text-gt-ink">기념일·제사</h1>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-gt-coral px-3.5 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> 추가</button>
        </header>

        <div className="px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-16 text-center text-sm leading-relaxed text-gt-muted">아직 등록한 기념일이 없어요.<br />생신·제사·기념일을 더해 미리 챙겨보세요 🎂</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((o) => {
                const d = daysUntil(o.month, o.day);
                return (
                  <div key={o.id} className="gt-card flex items-center gap-3 p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gt-coralLight text-xl">{OCC_META[o.type].emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[15px] text-gt-ink">{o.title}</p>
                      <p className="text-[12px] text-gt-muted">{o.is_lunar ? "음력 " : ""}{o.month}월 {o.day}일 · {OCC_META[o.type].label}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-lg font-semibold ${d <= o.notify_days_before ? "text-gt-coral" : "text-gt-ink"}`}>{d === 0 ? "오늘" : `D-${d}`}</p>
                      <button onClick={async () => { if (confirm("삭제할까요?")) { await deleteOccasion(o.id); reload(); } }} className="mt-0.5 text-[11px] text-gt-mutedLight"><Trash2 className="inline h-3 w-3" /> 삭제</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {items.some((o) => o.is_lunar) && (
            <p className="mt-4 px-1 text-[11px] leading-relaxed text-gt-mutedLight">※ 음력은 매년 양력 날짜가 달라져요. 지금은 입력한 날짜 기준으로 알려드려요(정밀 음력 변환은 추후).</p>
          )}
        </div>
      </main>
      <BottomNav />

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-t-[1.75rem] bg-gt-cream p-5 sm:rounded-[1.5rem]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-serif text-lg text-gt-ink"><CalendarHeart className="h-5 w-5 text-gt-coral" /> 기념일 추가</p>
              <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-paper2"><X className="h-4 w-4" /></button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 어머니 생신, 아버지 제사"
              className="w-full rounded-xl border border-gt-line bg-white px-3.5 py-2.5 font-serif text-[15px] outline-none focus:border-gt-coral" />
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {(Object.keys(OCC_META) as OccasionType[]).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`rounded-xl py-2 text-[12px] font-semibold ${type === t ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}>
                  {OCC_META[t].emoji} {OCC_META[t].label.split("/")[0]}
                </button>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <input value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="월" inputMode="numeric" className="w-16 rounded-xl border border-gt-line bg-white px-3 py-2.5 text-center font-serif outline-none focus:border-gt-coral" />
              <span className="text-gt-muted">월</span>
              <input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="일" inputMode="numeric" className="w-16 rounded-xl border border-gt-line bg-white px-3 py-2.5 text-center font-serif outline-none focus:border-gt-coral" />
              <span className="text-gt-muted">일</span>
              <button onClick={() => setLunar((v) => !v)} className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold ${lunar ? "bg-gt-ink text-white" : "bg-gt-paper2 text-gt-ink"}`}>{lunar ? "음력" : "양력"}</button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[13px] text-gt-muted">며칠 전 알림</span>
              {[1, 3, 7].map((n) => (
                <button key={n} onClick={() => setBefore(n)} className={`rounded-full px-3 py-1 text-xs font-semibold ${before === n ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}>{n}일 전</button>
              ))}
            </div>
            <button onClick={save} disabled={busy || !title.trim() || !month || !day} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 저장
            </button>
          </div>
        </div>
      )}
    </>
  );
}
