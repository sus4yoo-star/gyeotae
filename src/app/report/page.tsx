"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pill, Phone, Image as ImageIcon, Mic, AlertTriangle, Bell, CalendarCheck } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCircleState } from "@/lib/circle";
import { getWeeklyReport, WeeklyReport } from "@/lib/report";

export default function ReportPage() {
  const { circle, status } = useCircleState();
  const [r, setR] = useState<WeeklyReport | null | undefined>(undefined);

  useEffect(() => {
    if (!circle?.id) return;
    getWeeklyReport(circle.id).then(setR).catch(() => setR(null));
  }, [circle?.id]);

  if (status === "loading") return (<><main className="gt-aurora flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></main><BottomNav /></>);
  if (status === "demo") return (
    <><main className="gt-aurora flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-bold text-gt-ink">주간 안심 리포트</h1>
      <p className="mt-2 text-[15px] text-gt-muted">로그인하면 이번 주 부모님의 안심 요약을 볼 수 있어요.</p>
      <Link href="/login" className="mt-5 rounded-2xl bg-gt-coral px-6 py-3 font-semibold text-white">로그인</Link>
    </main><BottomNav /></>
  );

  const headline = !r ? "" :
    r.sos > 0 ? "이번 주 SOS가 있었어요 — 잘 살펴주세요"
    : r.silence > 0 ? "무응답 알림이 있었어요"
    : r.medRate >= 80 ? "평안한 한 주였어요 💛"
    : "복약을 조금 더 챙겨드리면 좋아요";

  return (
    <>
      <main className="flex-1 overflow-y-auto gt-scroll bg-gt-cream">
        <header className="flex items-center gap-2 border-b border-gt-line px-4 py-3">
          <Link href="/family" className="flex h-8 w-8 items-center justify-center rounded-full bg-gt-paper2"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-serif text-lg text-gt-ink">주간 안심 리포트</h1>
        </header>

        {r === undefined ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></div>
        ) : r === null ? (
          <p className="px-6 py-16 text-center text-sm text-gt-muted">리포트를 불러오지 못했어요.</p>
        ) : (
          <div className="px-5 py-5">
            {/* headline */}
            <div className="gt-card p-5">
              <p className="font-display italic text-[11px] tracking-[0.16em] text-gt-coral">— THIS WEEK · 지난 7일 —</p>
              <p className="mt-1 font-serif text-xl text-gt-ink">{headline}</p>
              <p className="mt-1 text-[12px] text-gt-muted">{circle?.parent_name || "부모님"} · 활동한 날 {r.activeDays}/7일</p>
            </div>

            {/* 복약 이행률 */}
            <div className="gt-card mt-4 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-serif text-[15px] text-gt-ink"><Pill className="h-4 w-4 text-gt-coral" /> 복약 이행률</span>
                <span className="font-display text-2xl font-semibold text-gt-coral">{r.medRate}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gt-paper2">
                <div className="h-full rounded-full bg-gt-coral transition-all" style={{ width: `${r.medRate}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-gt-muted">{r.medTaken}회 복용 / 기준 {r.medExpected}회</p>
            </div>

            {/* 지표 그리드 */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Stat Icon={Phone} tint="#6B8B76" label="안부 응답" value={r.checkins} unit="회" />
              <Stat Icon={CalendarCheck} tint="#C4843A" label="식사 기록" value={r.meals} unit="회" />
              <Stat Icon={Mic} tint="#DC6B4A" label="음성 메시지" value={r.voices} unit="건" />
              <Stat Icon={ImageIcon} tint="#9B5333" label="사진·영상" value={r.photos} unit="개" />
              <Stat Icon={AlertTriangle} tint="#CC3A3A" label="SOS" value={r.sos} unit="회" alarm={r.sos > 0} />
              <Stat Icon={Bell} tint="#C4A053" label="무응답 알림" value={r.silence} unit="회" alarm={r.silence > 0} />
            </div>

            <p className="mt-5 px-1 text-center text-[11px] leading-relaxed text-gt-mutedLight">
              곁에 · 가족이 함께 본 한 주의 기록이에요. 숫자보다 마음이 먼저예요 💛
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function Stat({ Icon, tint, label, value, unit, alarm }: { Icon: React.ElementType; tint: string; label: string; value: number; unit: string; alarm?: boolean }) {
  return (
    <div className={`gt-card p-4 ${alarm ? "ring-1 ring-gt-danger/30" : ""}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: tint }} />
        <span className="font-display text-[11px] font-semibold tracking-wide text-gt-muted">{label}</span>
      </div>
      <p className={`font-serif text-2xl ${alarm ? "font-bold text-gt-danger" : "text-gt-ink"}`}>{value}<span className="ml-0.5 text-sm font-normal text-gt-muted">{unit}</span></p>
    </div>
  );
}
