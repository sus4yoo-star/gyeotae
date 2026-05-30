"use client";

import { useEffect, useState } from "react";
import {
  X, Droplet, Stethoscope, TriangleAlert, Pill, Scissors,
  FileClock, PhoneCall, Pencil, Check,
} from "lucide-react";

export interface MedicalInfo {
  name: string; age: string; sex: string;
  blood: string;
  conditions: string;
  allergies: string;
  meds: string;
  surgeries: string;
  history: string;
  emergency: string;
}

const DEFAULT_INFO: MedicalInfo = {
  name: "이옥자", age: "72", sex: "여성",
  blood: "A형 Rh+",
  conditions: "고혈압, 당뇨(2형)",
  allergies: "페니실린, 새우",
  meds: "아침 — 혈압약(암로디핀), 당뇨약(메트포르민)\n저녁 — 콜레스테롤약(아토르바스타틴)",
  surgeries: "2019 무릎 인공관절 수술 (부산대학교병원)",
  history: "2015 담낭 절제술 · 2021 백내장 수술",
  emergency: "막내딸 김미경 010-1234-5678\n주치의 박정호 (부산365의원) 051-000-0000",
};

const KEY = "gyeotae-medical";

const FIELDS: { key: keyof MedicalInfo; label: string; Icon: any; tint: string; multiline?: boolean }[] = [
  { key: "blood",      label: "혈액형",        Icon: Droplet,      tint: "#CC3A3A" },
  { key: "conditions", label: "지병",          Icon: Stethoscope,  tint: "#9B5333" },
  { key: "allergies",  label: "알레르기",      Icon: TriangleAlert, tint: "#C4A053" },
  { key: "meds",       label: "복용 중인 약",   Icon: Pill,         tint: "#DC6B4A", multiline: true },
  { key: "surgeries",  label: "수술 이력",      Icon: Scissors,     tint: "#6B8B76", multiline: true },
  { key: "history",    label: "병력",          Icon: FileClock,    tint: "#6E6657", multiline: true },
  { key: "emergency",  label: "응급 연락처",    Icon: PhoneCall,    tint: "#DC6B4A", multiline: true },
];

export function MedicalCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [info, setInfo] = useState<MedicalInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MedicalInfo>(DEFAULT_INFO);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const v = JSON.parse(raw); setInfo(v); setDraft(v); }
    } catch {}
  }, []);

  if (!open) return null;

  const save = () => {
    setInfo(draft);
    try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch {}
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-gt-cream sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="shrink-0 rounded-t-[2rem] px-6 pb-5 pt-5" style={{ background: "linear-gradient(135deg,#DC6B4A,#B8543A)" }}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/40 sm:hidden" />
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display italic text-[11px] tracking-[0.16em] text-white/80">EMERGENCY MEDICAL · 응급 의료 정보</p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-white">{info.name}</h3>
              <p className="text-sm text-white/85">{info.age}세 · {info.sex}</p>
            </div>
            <div className="flex items-center gap-2">
              {!editing && (
                <button onClick={() => { setDraft(info); setEditing(true); }} className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white">
                  <Pencil className="h-3 w-3" /> 편집
                </button>
              )}
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* big blood-type strip (always most prominent for paramedics) */}
        <div className="shrink-0 border-b border-gt-line bg-white px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "#FBE3E3" }}>
              <Droplet className="h-5 w-5" style={{ color: "#CC3A3A" }} fill="#CC3A3A" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-gt-muted">혈액형</p>
              {editing ? (
                <input value={draft.blood} onChange={(e) => setDraft({ ...draft, blood: e.target.value })}
                  className="w-full rounded-lg border border-gt-line bg-gt-cream px-2 py-1 font-serif text-lg outline-none focus:border-gt-coral" />
              ) : (
                <p className="font-serif text-xl font-bold text-gt-danger">{info.blood || "—"}</p>
              )}
            </div>
          </div>
        </div>

        {/* scrollable cards */}
        <div className="flex-1 overflow-y-auto gt-scroll px-5 py-4">
          <div className="space-y-3">
            {FIELDS.filter((f) => f.key !== "blood").map((f) => (
              <div key={f.key} className="gt-card p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${f.tint}1A` }}>
                    <f.Icon className="h-4 w-4" style={{ color: f.tint }} />
                  </span>
                  <span className="font-serif text-[15px] font-bold text-gt-ink">{f.label}</span>
                </div>
                {editing ? (
                  f.multiline ? (
                    <textarea value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} rows={3}
                      className="w-full resize-none rounded-xl border border-gt-line bg-gt-cream px-3 py-2 font-serif text-[14px] leading-relaxed outline-none focus:border-gt-coral" />
                  ) : (
                    <input value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      className="w-full rounded-xl border border-gt-line bg-gt-cream px-3 py-2 font-serif text-[14px] outline-none focus:border-gt-coral" />
                  )
                ) : (
                  <p className="whitespace-pre-line font-serif text-[14px] leading-relaxed text-gt-inkSoft">
                    {info[f.key] || <span className="text-gt-mutedLight">아직 입력하지 않았어요</span>}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!editing && (
            <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-gt-mutedLight">
              응급 상황 시 119 대원이나 의료진에게 이 화면을 보여주세요.<br />정보는 이 기기에 안전하게 저장됩니다.
            </p>
          )}
        </div>

        {/* footer */}
        {editing && (
          <div className="shrink-0 border-t border-gt-line bg-gt-cream p-4">
            <div className="flex gap-2.5">
              <button onClick={() => { setDraft(info); setEditing(false); }} className="flex-1 rounded-2xl bg-gt-paper2 py-3.5 font-semibold text-gt-ink">취소</button>
              <button onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3.5 font-semibold text-white">
                <Check className="h-4 w-4" /> 저장하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
