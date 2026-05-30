"use client";

import { useEffect, useState } from "react";
import { Check, Sun, Sunrise, Moon } from "lucide-react";
import { logEvent } from "@/lib/circle";

type DoseId = "morning" | "lunch" | "evening";
interface Dose { id: DoseId; label: string; meds: string; when: string; Icon: any; }

const DOSES: Dose[] = [
  { id: "morning", label: "아침 약", meds: "혈압약 · 당뇨약", when: "식후 30분", Icon: Sunrise },
  { id: "lunch",   label: "점심 약", meds: "당뇨약",          when: "식후 30분", Icon: Sun },
  { id: "evening", label: "저녁 약", meds: "혈압약 · 콜레스테롤약", when: "식후 30분", Icon: Moon },
];

const todayKey = () => {
  const d = new Date();
  return `gyeotae-meds-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * MedicationTracker — the "did I take my meds today?" card.
 * Saves to localStorage keyed by the date, so it persists when the app is
 * closed and reopened, and resets fresh each new day.
 */
export function MedicationTracker({ onToast }: { onToast?: (m: string) => void }) {
  const [taken, setTaken] = useState<Record<DoseId, string | null>>({
    morning: null, lunch: null, evening: null,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(todayKey());
      if (raw) setTaken(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const persist = (next: Record<DoseId, string | null>) => {
    setTaken(next);
    try { localStorage.setItem(todayKey(), JSON.stringify(next)); } catch {}
  };

  const toggle = (dose: Dose) => {
    const already = taken[dose.id];
    if (already) {
      persist({ ...taken, [dose.id]: null });
      onToast?.(`${dose.label} 기록을 취소했어요`);
      return;
    }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    persist({ ...taken, [dose.id]: time });
    onToast?.(`✓ ${dose.label}을 드셨어요 (${time})`);
    // tell the family (safe no-op in demo)
    logEvent(null, "med", `어머니가 ${dose.label}을 드셨어요`).catch(() => {});
  };

  const doneCount = Object.values(taken).filter(Boolean).length;
  const allDone = doneCount === DOSES.length;

  const headline = !loaded
    ? "약 챙기는 중…"
    : allDone
    ? "오늘 약, 모두 챙기셨어요"
    : doneCount === 0
    ? "오늘 약, 아직 안 드셨어요"
    : `오늘 약, ${DOSES.length - doneCount}개 남았어요`;

  return (
    <section className="px-5">
      <div
        className="relative overflow-hidden rounded-3xl border p-5"
        style={{
          borderColor: allDone ? "rgba(107,139,118,0.35)" : "rgba(196,160,83,0.3)",
          background: allDone
            ? "linear-gradient(135deg,#EEF3EF,#DCE6DE)"
            : "linear-gradient(135deg,#FBEEE0,#F2E9D2)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display italic text-[11px] tracking-[0.16em] text-gt-terra">
              MEDICATION · 오늘의 약
            </p>
            <p className={`mt-1 font-serif text-xl font-bold ${allDone ? "text-gt-sage" : "text-gt-ink"}`}>
              {allDone && "🎉 "}{headline}
            </p>
          </div>
          <div className="text-right">
            <span className={`font-display text-3xl font-medium ${allDone ? "text-gt-sage" : "text-gt-coral"}`}>
              {doneCount}
            </span>
            <span className="font-display text-lg text-gt-mutedLight">/{DOSES.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {DOSES.map((dose) => {
            const time = taken[dose.id];
            const on = !!time;
            return (
              <button
                key={dose.id}
                onClick={() => toggle(dose)}
                className="flex flex-col items-center rounded-2xl border-2 px-1 py-3.5 text-center transition-all active:scale-95"
                style={{
                  borderColor: on ? "#6B8B76" : "rgba(0,0,0,0.06)",
                  background: on ? "#6B8B76" : "rgba(255,255,255,0.8)",
                }}
              >
                <span
                  className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: on ? "rgba(255,255,255,0.22)" : "#FBEEE0" }}
                >
                  {on ? (
                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                  ) : (
                    <dose.Icon className="h-5 w-5 text-gt-coral" />
                  )}
                </span>
                <span className={`text-[13px] font-bold ${on ? "text-white" : "text-gt-ink"}`}>
                  {dose.label.replace(" 약", "")}
                </span>
                <span className={`mt-0.5 text-[10px] leading-tight ${on ? "text-white/85" : "text-gt-muted"}`}>
                  {on ? `${time} 드심` : "탭하세요"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3.5 text-center font-serif text-[12px] leading-relaxed text-gt-muted">
          {allDone
            ? "오늘 드실 약을 모두 챙기셨어요. 참 잘하셨어요."
            : "약을 드신 후 위 버튼을 한 번 눌러주세요"}
        </p>
      </div>
    </section>
  );
}
