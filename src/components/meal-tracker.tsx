"use client";

import { useEffect, useState } from "react";
import { Check, Coffee, Utensils, Soup } from "lucide-react";
import { logEvent } from "@/lib/circle";

export type MealId = "breakfast" | "lunch" | "dinner";
interface Meal { id: MealId; label: string; short: string; Icon: typeof Coffee }

export const MEALS: Meal[] = [
  { id: "breakfast", label: "아침 식사", short: "아침", Icon: Coffee },
  { id: "lunch",     label: "점심 식사", short: "점심", Icon: Utensils },
  { id: "dinner",    label: "저녁 식사", short: "저녁", Icon: Soup },
];

export type MealMap = Record<MealId, string | null>;
const EMPTY: MealMap = { breakfast: null, lunch: null, dinner: null };

const mealKey = () => {
  const d = new Date();
  return `gyeotae-meals-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

function readToday(): MealMap {
  try {
    const raw = localStorage.getItem(mealKey());
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return { ...EMPTY };
}

/** 부모님 화면: 식사를 한 번 탭으로 기록. 모임이 있으면 care_event로 남겨
 *  자녀 화면 '오늘 부모님 상태'의 식사 항목에 반영된다. */
export function MealTracker({ onToast, circleId }: { onToast?: (m: string) => void; circleId?: string | null }) {
  const [meals, setMeals] = useState<MealMap>(EMPTY);

  useEffect(() => { setMeals(readToday()); }, []);

  const record = (meal: Meal) => {
    if (meals[meal.id]) return; // 이미 기록됨
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const next = { ...meals, [meal.id]: time };
    setMeals(next);
    try { localStorage.setItem(mealKey(), JSON.stringify(next)); } catch {}
    onToast?.(`✓ ${meal.label}를 드셨어요 (${time})`);
    logEvent(circleId ?? null, "meal", `어머니가 ${meal.label}를 하셨어요`).catch(() => {});
  };

  const doneCount = Object.values(meals).filter(Boolean).length;

  return (
    <section className="px-5">
      <div className="rounded-3xl border border-gt-sage/25 p-5" style={{ background: "linear-gradient(135deg,#EEF3EF,#DCE6DE)" }}>
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <p className="font-display italic text-[11px] tracking-[0.16em] text-gt-terra">MEALS · 오늘의 식사</p>
            <p className="mt-1 font-serif text-xl font-bold text-gt-ink">
              {doneCount === 0 ? "오늘 식사를 기록해요" : doneCount === MEALS.length ? "세 끼 모두 드셨어요" : `${doneCount}끼 드셨어요`}
            </p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-medium text-gt-sage">{doneCount}</span>
            <span className="font-display text-lg text-gt-mutedLight">/{MEALS.length}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {MEALS.map((meal) => {
            const time = meals[meal.id];
            const on = !!time;
            return (
              <button key={meal.id} onClick={() => record(meal)} disabled={on}
                className="flex flex-col items-center rounded-2xl border-2 px-1 py-3.5 text-center transition-all active:scale-95 disabled:active:scale-100"
                style={{ borderColor: on ? "#6B8B76" : "rgba(0,0,0,0.06)", background: on ? "#6B8B76" : "rgba(255,255,255,0.8)" }}>
                <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: on ? "rgba(255,255,255,0.22)" : "#EEF3EF" }}>
                  {on ? <Check className="h-5 w-5 text-white" strokeWidth={3} /> : <meal.Icon className="h-5 w-5 text-gt-sage" />}
                </span>
                <span className={`text-[13px] font-bold ${on ? "text-white" : "text-gt-ink"}`}>{meal.short}</span>
                <span className={`mt-0.5 text-[10px] leading-tight ${on ? "text-white/85" : "text-gt-muted"}`}>{on ? `${time} 드심` : "탭하세요"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
