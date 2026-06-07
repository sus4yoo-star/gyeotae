"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, HeartPulse, Droplet } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCircleState } from "@/lib/circle";
import { useVitals, addBP, addGlucose, deleteVital, bpStatus, glucoseStatus, VitalKind, Vital } from "@/lib/vitals";

const TONE: Record<"ok" | "warn" | "high", string> = {
  ok: "text-gt-sage", warn: "text-gt-gold", high: "text-gt-danger",
};

export default function VitalsPage() {
  const { circle, status } = useCircleState();
  const [kind, setKind] = useState<VitalKind>("bp");
  const { items, reload } = useVitals(circle?.id, kind);
  const [busy, setBusy] = useState(false);
  // bp inputs
  const [sys, setSys] = useState(""); const [dia, setDia] = useState(""); const [pulse, setPulse] = useState("");
  // glucose inputs
  const [glu, setGlu] = useState(""); const [tag, setTag] = useState<"공복" | "식후">("공복");

  const save = async () => {
    if (!circle?.id) return;
    setBusy(true);
    try {
      if (kind === "bp") {
        if (!sys || !dia) return;
        await addBP(circle.id, Number(sys), Number(dia), pulse ? Number(pulse) : null);
        setSys(""); setDia(""); setPulse("");
      } else {
        if (!glu) return;
        await addGlucose(circle.id, Number(glu), tag);
        setGlu("");
      }
      reload();
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  if (status === "loading") return (<><main className="gt-aurora flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></main><BottomNav /></>);
  if (status === "demo") return (
    <><main className="gt-aurora flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-bold text-gt-ink">활력징후</h1>
      <p className="mt-2 text-[15px] text-gt-muted">로그인하면 혈압·혈당을 기록하고 추이를 볼 수 있어요.</p>
      <Link href="/login" className="mt-5 rounded-2xl bg-gt-coral px-6 py-3 font-semibold text-white">로그인</Link>
    </main><BottomNav /></>
  );

  const chrono = [...items].reverse();
  const series = chrono.map((v) => (kind === "bp" ? (v.systolic ?? 0) : (v.value ?? 0)));

  return (
    <>
      <main className="flex-1 overflow-y-auto gt-scroll bg-gt-cream">
        <header className="flex items-center gap-2 border-b border-gt-line px-4 py-3">
          <Link href="/family" className="flex h-8 w-8 items-center justify-center rounded-full bg-gt-paper2"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-serif text-lg text-gt-ink">활력징후</h1>
        </header>

        {/* tabs */}
        <div className="flex gap-2 px-5 pt-4">
          <button onClick={() => setKind("bp")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold ${kind === "bp" ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}><HeartPulse className="h-4 w-4" /> 혈압</button>
          <button onClick={() => setKind("glucose")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold ${kind === "glucose" ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}><Droplet className="h-4 w-4" /> 혈당</button>
        </div>

        {/* input */}
        <section className="px-5 pt-3">
          <div className="gt-card p-4">
            {kind === "bp" ? (
              <div className="flex items-end gap-2">
                <Num label="수축기" value={sys} onChange={setSys} placeholder="120" />
                <span className="pb-2.5 text-gt-muted">/</span>
                <Num label="이완기" value={dia} onChange={setDia} placeholder="80" />
                <Num label="맥박" value={pulse} onChange={setPulse} placeholder="70" />
                <button onClick={save} disabled={busy || !sys || !dia} className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-gt-coral px-4 font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}기록
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <Num label="혈당 (mg/dL)" value={glu} onChange={setGlu} placeholder="95" />
                <div className="flex gap-1 pb-0.5">
                  {(["공복", "식후"] as const).map((t) => (
                    <button key={t} onClick={() => setTag(t)} className={`rounded-lg px-2.5 py-2 text-[12px] font-semibold ${tag === t ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}>{t}</button>
                  ))}
                </div>
                <button onClick={save} disabled={busy || !glu} className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-gt-coral px-4 font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}기록
                </button>
              </div>
            )}
          </div>
        </section>

        {/* trend */}
        {series.length >= 2 && (
          <section className="px-5 pt-3">
            <div className="gt-card p-4">
              <p className="mb-2 font-display text-[11px] font-semibold tracking-wide text-gt-muted">최근 추이 {kind === "bp" ? "(수축기)" : "(mg/dL)"}</p>
              <Spark values={series} />
            </div>
          </section>
        )}

        {/* list */}
        <section className="px-5 py-3">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-gt-muted">아직 기록이 없어요. 위에서 첫 수치를 남겨보세요.</p>
          ) : (
            <div className="space-y-2">
              {items.map((v) => <Row key={v.id} v={v} kind={kind} onDelete={async () => { await deleteVital(v.id); reload(); }} />)}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}

function Num({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-[11px] font-semibold text-gt-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={placeholder} inputMode="numeric"
        className="h-11 w-full rounded-xl border border-gt-line bg-white px-3 text-center font-serif text-lg outline-none focus:border-gt-coral" />
    </label>
  );
}

function Row({ v, kind, onDelete }: { v: Vital; kind: VitalKind; onDelete: () => void }) {
  const s = kind === "bp" ? bpStatus(v.systolic ?? 0, v.diastolic ?? 0) : glucoseStatus(v.value ?? 0, v.tag);
  return (
    <div className="gt-card flex items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[16px] text-gt-ink">
          {kind === "bp" ? <>{v.systolic}/{v.diastolic} <span className="text-xs text-gt-muted">mmHg{v.pulse ? ` · 맥박 ${v.pulse}` : ""}</span></>
            : <>{v.value} <span className="text-xs text-gt-muted">mg/dL · {v.tag || "공복"}</span></>}
        </p>
        <p className="text-[11px] text-gt-muted">{new Date(v.measured_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <span className={`text-sm font-semibold ${TONE[s.tone]}`}>{s.label}</span>
      <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-paper2 text-gt-muted"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 300, h = 70, pad = 6;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full">
      <polyline fill="none" stroke="#DC6B4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.join(" ")} />
      {values.map((v, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#DC6B4A" />;
      })}
    </svg>
  );
}
