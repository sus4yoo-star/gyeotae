"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  X, Droplet, Stethoscope, TriangleAlert, Pill, Scissors,
  FileClock, PhoneCall, Pencil, Check, Download, Share2,
} from "lucide-react";

export interface MedicalInfo {
  name: string; age: string; sex: string;
  blood: string; conditions: string; allergies: string;
  meds: string; surgeries: string; history: string; emergency: string;
}

const DEFAULT_INFO: MedicalInfo = {
  name: "이옥자", age: "72", sex: "여성",
  blood: "A형 Rh+",
  conditions: "고혈압, 당뇨(2형)",
  allergies: "페니실린, 새우",
  meds: "아침 — 혈압약(암로디핀), 당뇨약(메트포르민)\n저녁 — 콜레스테롤약(아토르바스타틴)",
  surgeries: "2019 무릎 인공관절 (부산대병원)",
  history: "2015 담낭 절제 · 2021 백내장",
  emergency: "막내딸 김미경 010-1234-5678\n주치의 박정호 (부산365의원)",
};

const KEY = "gyeotae-medical";

const FIELDS: { key: keyof MedicalInfo; label: string; Icon: any; tint: string; full?: boolean }[] = [
  { key: "conditions", label: "지병",        Icon: Stethoscope,   tint: "#9B5333" },
  { key: "allergies",  label: "알레르기",     Icon: TriangleAlert, tint: "#C4A053" },
  { key: "meds",       label: "복용 중인 약",  Icon: Pill,          tint: "#DC6B4A", full: true },
  { key: "surgeries",  label: "수술 이력",     Icon: Scissors,      tint: "#6B8B76", full: true },
  { key: "history",    label: "병력",         Icon: FileClock,     tint: "#6E6657", full: true },
  { key: "emergency",  label: "응급 연락처",   Icon: PhoneCall,     tint: "#DC6B4A", full: true },
];

export function MedicalCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [info, setInfo] = useState<MedicalInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MedicalInfo>(DEFAULT_INFO);
  const [busy, setBusy] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const v = JSON.parse(raw); setInfo(v); setDraft(v); } } catch {}
  }, []);

  if (!open) return null;

  const save = () => {
    setInfo(draft);
    try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch {}
    setEditing(false);
  };

  async function makePng(): Promise<string | null> {
    if (!captureRef.current) return null;
    return toPng(captureRef.current, { pixelRatio: 2.5, backgroundColor: "#FAF6EE", cacheBust: true });
  }

  async function saveImage() {
    setBusy(true);
    try {
      const url = await makePng();
      if (url) { const a = document.createElement("a"); a.download = `곁에-의료카드-${info.name}.png`; a.href = url; a.click(); }
    } catch {} finally { setBusy(false); }
  }

  async function shareImage() {
    setBusy(true);
    try {
      const url = await makePng();
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `곁에-의료카드-${info.name}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "곁에 응급 의료 정보", text: `${info.name}님의 응급 의료 정보` });
      } else {
        const a = document.createElement("a"); a.download = file.name; a.href = url; a.click();
      }
    } catch {} finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-gt-cream sm:rounded-[1.5rem]" onClick={(e) => e.stopPropagation()}>
        {/* top bar */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <p className="font-display italic text-[11px] tracking-[0.16em] text-gt-terra">EMERGENCY MEDICAL · 응급 의료 정보</p>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => { setDraft(info); setEditing(true); }} className="flex items-center gap-1 rounded-full bg-gt-paper2 px-2.5 py-1 text-xs font-semibold text-gt-ink">
                <Pencil className="h-3 w-3" /> 편집
              </button>
            )}
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-paper2 text-gt-ink"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* scrollable capturable card */}
        <div className="flex-1 overflow-y-auto gt-scroll px-4 pb-3">
          <div ref={captureRef} className="overflow-hidden rounded-2xl border border-gt-line bg-white">
            {/* compact identity + blood */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(135deg,#DC6B4A,#B8543A)" }}>
              <div>
                {editing ? (
                  <div className="flex gap-1.5">
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-20 rounded bg-white/90 px-2 py-0.5 font-serif text-lg font-bold text-gt-ink outline-none" />
                    <input value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} className="w-12 rounded bg-white/90 px-2 py-0.5 text-sm text-gt-ink outline-none" />
                  </div>
                ) : (
                  <h3 className="font-serif text-xl font-bold text-white">{info.name} <span className="text-sm font-normal opacity-85">{info.age}세 · {info.sex}</span></h3>
                )}
                <p className="font-display italic text-[10px] tracking-[0.14em] text-white/75">곁에 · GYEOTAE</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5">
                <Droplet className="h-4 w-4" style={{ color: "#CC3A3A" }} fill="#CC3A3A" />
                {editing ? (
                  <input value={draft.blood} onChange={(e) => setDraft({ ...draft, blood: e.target.value })} className="w-20 rounded bg-gt-cream px-1.5 py-0.5 font-serif text-base font-bold text-gt-danger outline-none" />
                ) : (
                  <span className="font-serif text-lg font-bold text-gt-danger">{info.blood || "—"}</span>
                )}
              </div>
            </div>

            {/* info grid — short fields 2-col, long fields full */}
            <div className="grid grid-cols-2 gap-px bg-gt-line">
              {FIELDS.map((f) => (
                <div key={f.key} className={`bg-white p-3 ${f.full ? "col-span-2" : ""}`}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <f.Icon className="h-3.5 w-3.5" style={{ color: f.tint }} />
                    <span className="font-display text-[11px] font-semibold tracking-wide text-gt-muted">{f.label}</span>
                  </div>
                  {editing ? (
                    f.full ? (
                      <textarea value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} rows={2}
                        className="w-full resize-none rounded-lg border border-gt-line bg-gt-cream px-2 py-1.5 font-serif text-[13px] leading-relaxed outline-none focus:border-gt-coral" />
                    ) : (
                      <input value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="w-full rounded-lg border border-gt-line bg-gt-cream px-2 py-1.5 font-serif text-[13px] outline-none focus:border-gt-coral" />
                    )
                  ) : (
                    <p className="whitespace-pre-line font-serif text-[13px] leading-snug text-gt-inkSoft">
                      {info[f.key] || <span className="text-gt-mutedLight">—</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer actions */}
        <div className="shrink-0 border-t border-gt-line bg-gt-cream p-4">
          {editing ? (
            <div className="flex gap-2.5">
              <button onClick={() => { setDraft(info); setEditing(false); }} className="flex-1 rounded-2xl bg-gt-paper2 py-3 font-semibold text-gt-ink">취소</button>
              <button onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white"><Check className="h-4 w-4" /> 저장하기</button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button onClick={saveImage} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-paper2 py-3 font-semibold text-gt-ink disabled:opacity-50">
                <Download className="h-4 w-4" /> {busy ? "처리 중…" : "이미지 저장"}
              </button>
              <button onClick={shareImage} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white disabled:opacity-50">
                <Share2 className="h-4 w-4" /> 공유하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
