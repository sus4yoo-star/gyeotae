"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Video, Send, ShieldPlus, CheckCircle2, Circle, Heart, UserPlus, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { PushManager } from "@/components/push-manager";
import { MedicalCard } from "@/components/medical-card";
import { MedicationStatusCard } from "@/components/medication-tracker";
import { Button } from "@/components/ui/button";
import { useCircleState } from "@/lib/circle";

export default function FamilyDashboard() {
  const { circle, status } = useCircleState();
  const [warmth, setWarmth] = useState(67);
  const [toast, setToast] = useState<string | null>(null);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const bump = (n: number) => { setWarmth((w) => Math.min(100, w + n)); showToast(`💛 온기 점수가 +${n} 올랐어요`); };

  const week = [14, 24, 42, 18, 30, 22, 46];
  const days = ["금", "토", "일", "월", "화", "수", "오늘"];
  const parentName = circle?.parent_name || "이옥자";

  // Logged in but not in a circle yet → invite them to set one up.
  if (status === "needs-onboarding") {
    return (
      <>
        <main className="gt-aurora relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="relative z-10 w-full max-w-sm animate-rise">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-lg shadow-gt-coral/30">
              <Heart className="h-8 w-8 text-white" fill="white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gt-ink">아직 함께하는 모임이 없어요</h1>
            <p className="mt-2.5 text-[15px] leading-relaxed text-gt-muted">
              부모님을 등록해 새 모임을 만들거나,<br />가족에게 받은 초대코드로 합류하세요.
            </p>
            <Button asChild variant="coral" className="mt-6 w-full">
              <Link href="/setup"><UserPlus className="h-4 w-4" /> 가족 모임 시작하기 <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <main className="gt-aurora relative flex-1 overflow-y-auto gt-scroll pb-6">
        <div className="relative z-10">
          {/* Header */}
          <header className="px-6 pt-8 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1.5 font-display italic text-xs tracking-[0.14em] text-gt-terra">— TODAY · 자녀 화면 —</p>
                <h1 className="mb-1 font-serif text-3xl text-gt-ink">미경 님, 안녕하세요</h1>
                <p className="text-sm text-gt-muted"><strong className="text-gt-coral">{parentName} 어머니</strong>의 곁에를 지키고 있어요</p>
              </div>
              <PushManager circleId={circle?.id} />
            </div>
            {circle && <InviteChip code={circle.invite_code} onCopied={() => showToast("📋 초대코드를 복사했어요")} />}
          </header>

          {/* 온기 점수 HERO */}
          <section className="px-5">
            <div className="gt-card relative overflow-hidden p-6">
              <span className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle,#FBEEE0,transparent 70%)" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="font-display italic text-[11px] tracking-[0.18em] text-gt-coral">— WARMTH INDEX · 오늘의 온기 —</p>
                  <p className="font-serif text-[22px] text-gt-ink">사랑이 닿은 오늘</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-[56px] font-medium leading-none text-gt-coral">{warmth}</div>
                  <div className="font-display italic text-sm text-gt-muted">/ 100</div>
                </div>
              </div>

              <div className="relative my-4 flex items-center gap-4">
                <div className="h-[72px] w-[72px] shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <defs><clipPath id="hc"><path d="M50,88 C50,88 12,62 12,38 C12,24 22,16 32,16 C40,16 46,20 50,28 C54,20 60,16 68,16 C78,16 88,24 88,38 C88,62 50,88 50,88 Z" /></clipPath></defs>
                    <rect x="0" y="0" width="100" height="100" fill="#FBEEE0" clipPath="url(#hc)" />
                    <rect x="0" y={100 - warmth} width="100" height={warmth} fill="#DC6B4A" clipPath="url(#hc)" style={{ transition: "all 0.8s ease" }} />
                  </svg>
                </div>
                <div className="flex-1 space-y-1">
                  {[["3", "개의 메시지"], ["1", "번의 음성 통화"], ["2", "장의 사진 공유"], ["3", "명의 가족이 닿음"]].map(([n, t], i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gt-inkSoft">
                      <span className="h-1.5 w-1.5 rounded-full bg-gt-coral" />
                      <span className="font-display text-sm font-semibold text-gt-coral">{n}</span>{t}
                    </div>
                  ))}
                </div>
              </div>

              {/* weekly trend */}
              <div className="flex items-end justify-between gap-1.5 border-t border-gt-line pt-3.5">
                {week.map((h, i) => {
                  const today = i === week.length - 1;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className={`w-full rounded ${today ? "bg-gt-coral" : "bg-gt-coralSoft"}`} style={{ height: h }} />
                      <span className={`font-display text-[10px] ${today ? "font-bold not-italic text-gt-coral" : "italic text-gt-muted"}`}>{days[i]}</span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3.5 border-t border-dashed border-gt-line pt-3.5 text-xs leading-relaxed text-gt-inkSoft">
                이번 주 어머니께 가장 따뜻한 사람: <strong className="text-gt-coral">막내딸 미경 (당신)</strong>.<br />
                주말에 형제자매께 안부를 청해보세요.
              </p>
            </div>
          </section>

          {/* 오늘 부모님 복약 현황 (부모님 화면과 동기화) */}
          <section className="mt-4 px-5">
            <MedicationStatusCard circleId={circle?.id ?? null} />
          </section>

          {/* Status card */}
          <section className="mt-4 px-5">
            <div className="gt-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gt-sage/15 px-5 py-4" style={{ background: "linear-gradient(135deg,#EEF3EF,#DCE6DE)" }}>
                <span className="h-2.5 w-2.5 rounded-full bg-gt-sage" style={{ boxShadow: "0 0 0 4px rgba(107,139,118,0.2)" }} />
                <div className="flex-1">
                  <p className="font-display italic text-[11px] text-gt-muted">PARENT&apos;S STATUS · 오늘 부모님 상태</p>
                  <p className="font-serif text-[15px] text-gt-ink">평안하세요. 모닝콜 응답 완료, 활동 정상</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gt-line">
                <StatusCell label="AI MORNING CALL" value="응답 완료" sub="today, 7:30 AM" ok />
                <StatusCell label="MEAL · 식사" value="아침 드심" sub="today, 8:05 AM" ok />
                <StatusCell label="LAST ACTIVITY" value="방금" sub="phone activity" ok />
                <StatusCell label="LOCATION" value="자택" sub="Busan, 동래구" ok />
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="mt-4 grid grid-cols-2 gap-2.5 px-5">
            <ActionBtn icon={Mic} main="음성 보내기" sub="엄마에게" color="coral" onClick={() => bump(5)} />
            <ActionBtn icon={Video} main="영상통화" sub="바로 연결" color="sage" onClick={() => showToast("📹 영상통화 연결 중...")} />
            <ActionBtn icon={Send} main="손주 영상" sub="엄마께 전달" color="gold" onClick={() => bump(5)} />
            <ActionBtn icon={ShieldPlus} main="의료카드" sub="응급 정보" color="danger" onClick={() => setMedicalOpen(true)} />
          </section>

          {/* Activity feed */}
          <section className="mt-5 px-5">
            <div className="gt-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-gt-line px-5 py-4">
                <span className="font-serif text-base text-gt-ink">실시간 활동</span>
                <span className="rounded-full bg-gt-coralSoft px-2.5 py-1 font-display italic text-xs text-gt-coral">3건</span>
              </div>
              <div className="divide-y divide-gt-line">
                <FeedItem emoji="🎙️" text={<>어머니가 <strong className="text-gt-coral">&quot;첫 직장 이야기&quot;</strong>를 음성으로 기록하셨어요 (3분 12초)</>} time="8분 전" />
                <FeedItem emoji="🎬" text={<>어머니가 손녀 <strong className="text-gt-coral">지윤이의 영상</strong>을 보셨어요</>} time="35분 전" />
                <FeedItem emoji="✓" text={<>AI 모닝콜에 응답 — <strong className="text-gt-coral">&quot;잘 잤어요, 오늘 비온대&quot;</strong></>} time="today, 7:31 AM" />
              </div>
            </div>
          </section>
        </div>
      </main>

      <BottomNav />

      {/* 응급 의료 정보 카드 */}
      <MedicalCard open={medicalOpen} onClose={() => setMedicalOpen(false)} />

      {toast && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 animate-rise rounded-2xl bg-gt-ink px-5 py-3.5 text-sm text-white shadow-2xl">{toast}</div>
      )}
    </>
  );
}

function InviteChip({ code, onCopied }: { code: string; onCopied: () => void }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); onCopied(); } catch {}
  };
  return (
    <button onClick={copy} className="mt-3 flex items-center gap-2 rounded-full border border-gt-coral/30 bg-gt-coralSoft px-3 py-1.5 text-xs text-gt-coralDeep">
      <UserPlus className="h-3.5 w-3.5" />
      가족 초대코드 <strong className="font-display tracking-[0.15em]">{code.toUpperCase()}</strong>
    </button>
  );
}

interface StatusCellProps { label: string; value: string; sub: string; ok?: boolean }
function StatusCell({ label, value, sub, ok }: StatusCellProps) {
  return (
    <div className="bg-white p-4">
      <p className="mb-1.5 font-display italic text-[11px] tracking-wide text-gt-muted">{label}</p>
      <p className="flex items-center gap-2 font-serif text-[15px] text-gt-ink">
        {ok ? <CheckCircle2 className="h-4 w-4 text-gt-sage" /> : <Circle className="h-4 w-4 text-gt-mutedLight" />}{value}
      </p>
      <p className="mt-1 font-display italic text-[11px] text-gt-muted">{sub}</p>
    </div>
  );
}

type ActionTone = "coral" | "sage" | "gold" | "danger";
interface ActionBtnProps { icon: LucideIcon; main: string; sub: string; color: ActionTone; onClick?: () => void }
function ActionBtn({ icon: Icon, main, sub, color, onClick }: ActionBtnProps) {
  const bg: Record<ActionTone, string> = { coral: "bg-gt-coralLight text-gt-coralDeep", sage: "bg-gt-sageLight text-gt-sage", gold: "bg-gt-goldSoft text-gt-gold", danger: "bg-gt-dangerSoft text-gt-danger" };
  return (
    <button onClick={onClick} className="gt-card flex items-center gap-3 p-3.5 text-left active:scale-[0.98] transition-transform">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg[color]}`}><Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /></span>
      <span><span className="block text-[13px] font-semibold text-gt-ink">{main}</span><span className="block text-[11px] text-gt-muted">{sub}</span></span>
    </button>
  );
}

interface FeedItemProps { emoji: string; text: React.ReactNode; time: string }
function FeedItem({ emoji, text, time }: FeedItemProps) {
  return (
    <div className="flex gap-3 px-5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gt-coralLight text-sm">{emoji}</span>
      <div className="flex-1"><p className="text-[13px] leading-snug text-gt-ink">{text}</p><p className="mt-0.5 font-display italic text-[11px] text-gt-muted">{time}</p></div>
    </div>
  );
}
