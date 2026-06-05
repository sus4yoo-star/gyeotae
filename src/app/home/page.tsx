"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, CheckCircle2, Pill, HeartPulse, Mic, Play, X, MapPin, Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { MedicationTracker } from "@/components/medication-tracker";
import { MealTracker } from "@/components/meal-tracker";
import { MedicalCard } from "@/components/medical-card";
import { fireSOS, useMyCircle } from "@/lib/circle";

export default function ParentHome() {
  const circle = useMyCircle();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [sosOpen, setSosOpen] = useState(false);
  const [sosStage, setSosStage] = useState(0);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      setDate(d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }));
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, []);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const triggerSOS = () => {
    setSosOpen(true);
    setSosStage(0);
    [1, 2, 3, 4].forEach((n) => setTimeout(() => setSosStage(n), n * 700));
    // Real mode: log the event and push to the whole family (safe no-op in demo).
    fireSOS(circle?.id ?? null).catch(() => {});
  };

  return (
    <>
      <main className="gt-aurora relative flex-1 overflow-y-auto gt-scroll pb-6">
        <div className="relative z-10">
          {/* Editorial header */}
          <header className="px-7 pt-8 pb-2">
            <p className="mb-1 flex items-center gap-2 font-display italic text-[13px] tracking-[0.12em] text-gt-terra">
              <span className="inline-block h-px w-6 bg-gt-terra" /> TODAY · 오늘
            </p>
            <p className="mb-1 font-serif text-base text-gt-muted">{date}</p>
            <div className="font-display text-[88px] font-medium leading-none tracking-tight text-gt-ink">
              {time.split(":")[0]}<span className="animate-blink">:</span>{time.split(":")[1]}
            </div>
            <p className="mt-5 font-serif text-[17px] leading-relaxed text-gt-inkSoft">
              어머니, <em className="font-display not-italic text-gt-coral">평안한 아침</em>이에요.<br />
              오늘 <strong className="text-gt-coral">막내딸의 음성</strong>과 손녀{" "}
              <strong className="text-gt-coral">지윤이의 영상</strong>이 도착했어요.
            </p>
          </header>

          {/* 오늘의 약 — 첫 화면에서 바로 보이는 복약 체크 */}
          <div className="mt-5">
            <MedicationTracker onToast={showToast} circleId={circle?.id ?? null} />
          </div>

          {/* 오늘의 식사 */}
          <div className="mt-3">
            <MealTracker onToast={showToast} circleId={circle?.id ?? null} />
          </div>

          {/* SOS */}
          <section className="flex flex-col items-center px-7 pb-8 pt-7">
            <div className="relative my-3">
              <span className="absolute -inset-2.5 animate-heartbeat rounded-full border-2 border-gt-danger/30" aria-hidden />
              <span className="absolute -inset-6 animate-heartbeat rounded-full border border-gt-danger/15" style={{ animationDelay: "0.6s" }} aria-hidden />
              <button
                onClick={triggerSOS}
                className="relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-full font-display text-[40px] font-semibold text-white active:scale-95 transition-transform"
                style={{
                  background: "radial-gradient(circle at 30% 28%, #FF6F5F 0%, #DC3A3A 55%, #962020 100%)",
                  boxShadow: "0 18px 44px rgba(180,40,40,0.42), inset 0 -10px 24px rgba(0,0,0,0.18)",
                }}
              >
                SOS
                <span className="font-sans text-[13px] tracking-[0.18em] opacity-95">긴급 도움</span>
              </button>
            </div>
            <p className="text-center font-serif text-sm leading-relaxed text-gt-muted">
              위급할 때 한 번만 누르세요<br />가족 모두에게 곧바로 알려드려요
            </p>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-4 gap-2.5 px-4">
            <QuickBtn icon={Users} label="가족" sub="메시지" color="coral" badge="2" href="/family" />
            <QuickBtn icon={CheckCircle2} label="안부" sub="오늘 어때요" color="sage" href="/call" />
            <QuickBtn icon={Pill} label="약" sub="복용 체크" color="gold" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); showToast("위 '오늘의 약'에서 체크하세요"); }} />
            <QuickBtn icon={HeartPulse} label="의료카드" sub="응급 정보" color="terra" onClick={() => setMedicalOpen(true)} />
          </section>

          {/* 손주 편지함 */}
          <div className="section-label mt-9 px-7">
            <span className="sl-num">01</span><span className="sl-title">오늘 손주들의 마음</span>
          </div>
          <section className="grid grid-cols-2 gap-3 px-4">
            <GrandchildCard name="지윤" age="5 · 손녀" badge="▶ 영상" tone="jiyun"
              quote="할머니 보고싶어요! 종이접기 했어요" onClick={() => showToast("🎀 지윤이의 영상을 재생합니다")} />
            <GrandchildCard name="시우" age="7 · 외손자" badge="🎵 음성" tone="siwoo"
              quote="할머니, 어제 축구 시합에서 이겼어요" onClick={() => showToast("⚽ 시우의 음성을 재생합니다")} />
          </section>

          {/* 엄마의 이야기 (memoir → 셀라 bridge) */}
          <div className="section-label mt-9 px-7">
            <span className="sl-num">02</span><span className="sl-title">엄마의 한 이야기</span>
          </div>
          <section className="px-5">
            <div className="relative overflow-hidden rounded-3xl border border-gt-gold/25 p-6"
              style={{ background: "linear-gradient(135deg,#F7F0E4,#F2E9D2)" }}>
              <span className="pointer-events-none absolute -top-8 left-4 font-display text-[140px] leading-none text-gt-gold/15">&ldquo;</span>
              <p className="relative font-display italic text-xs tracking-[0.12em] text-gt-gold">QUESTION OF THE DAY</p>
              <p className="relative mt-2 font-serif text-xl leading-snug text-gt-ink">엄마, 처음 일하셨을 때<br />어떤 곳이었어요?</p>
              <div className="relative mt-4 flex gap-2.5">
                <button onClick={() => showToast("🎙️ 녹음을 시작합니다")}
                  className="flex items-center gap-2 rounded-full bg-gt-ink px-5 py-3 text-[13px] font-semibold text-gt-cream">
                  <Mic className="h-3.5 w-3.5" /> 음성으로 답하기
                </button>
                <button onClick={() => showToast("다음 질문: 엄마가 가장 좋아하는 계절은?")}
                  className="rounded-full border border-gt-ink px-5 py-3 text-[13px] font-semibold text-gt-ink">다음 질문</button>
              </div>
              <p className="relative mt-3.5 flex items-center gap-1.5 text-[11px] text-gt-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-gt-coral" /> 지금까지 7개의 이야기가 기록되었어요 · 셀라로 영상 만들기
              </p>
            </div>
          </section>

          {/* 막내딸 음성 */}
          <div className="section-label mt-9 px-7">
            <span className="sl-num">03</span><span className="sl-title">막내딸이 보낸 음성</span>
          </div>
          <section className="px-5">
            <button onClick={() => showToast("🎵 막내딸 음성 메시지 재생 중")}
              className="gt-card flex w-full items-center gap-3.5 p-4 text-left active:scale-[0.98] transition-transform">
              <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-coralDeep font-serif text-lg font-bold text-white" style={{ height: 52, width: 52 }}>
                미경
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-gt-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display italic text-xs text-gt-muted">막내딸 김미경 · This morning, 7:14</p>
                <p className="truncate font-serif text-[15px] text-gt-ink">엄마 잘 주무셨어요? 오늘 비 온대요. 외출하실 때 우산 꼭…</p>
                <div className="mt-2 flex h-4 items-center gap-0.5">
                  {[40, 70, 90, 60, 80, 50, 75, 45, 65, 85, 55, 70].map((h, i) => (
                    <span key={i} className="w-0.5 animate-wave rounded-full bg-gt-coral" style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gt-ink text-white"><Play className="ml-0.5 h-4 w-4" fill="white" /></span>
            </button>
          </section>

          {/* 추억 */}
          <div className="section-label mt-9 px-7">
            <span className="sl-num">04</span><span className="sl-title">추억의 한 컷</span>
          </div>
          <section className="overflow-x-auto gt-scroll pb-2">
            <div className="flex min-w-max gap-4 px-7 py-3">
              <Polaroid scene="jiyun" date="YESTERDAY" caption="지윤이 첫 종이접기" rot={-3} />
              <Polaroid scene="sunset" date="2024.10.05" caption="막내딸과 강릉 여행" rot={2} />
              <Polaroid scene="wedding" date="2022.04.16" caption="큰며느리 결혼식" rot={-1.5} />
            </div>
          </section>

          {/* 오늘의 말씀 */}
          <section className="px-5 pt-4">
            <div className="rounded-3xl border border-gt-sage/20 p-6 text-center" style={{ background: "linear-gradient(135deg,#EEF3EF,#DCE6DE)" }}>
              <p className="mb-3 font-display italic text-xs tracking-[0.18em] text-gt-sage">— TODAY&apos;S WORD · 오늘의 한 줄 —</p>
              <p className="font-serif text-lg leading-relaxed text-gt-ink">&ldquo;사랑은 오래 참고, 사랑은 온유하며&rdquo;</p>
              <p className="mt-2 font-display italic text-xs text-gt-muted">고린도전서 13장 4절</p>
            </div>
          </section>
        </div>
      </main>

      <BottomNav />

      {/* 응급 의료 정보 카드 */}
      <MedicalCard open={medicalOpen} onClose={() => setMedicalOpen(false)} />

      {/* SOS Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setSosOpen(false)}>
          <div className="w-full max-w-md rounded-t-[2rem] bg-gt-cream p-6 sm:rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gt-line" />
            <p className="font-display italic text-xs tracking-[0.12em] text-gt-terra">EMERGENCY · 긴급</p>
            <h3 className="mb-2 flex items-center gap-2 font-serif text-2xl font-bold text-gt-danger">🚨 SOS 전송 중</h3>
            <p className="mb-5 text-sm leading-relaxed text-gt-muted">지금 곧바로 가족 모두에게 알리고 있어요. 잠시만 기다려주세요.</p>
            <div className="gt-card space-y-1 p-4">
              {[
                { ic: <MapPin className="h-4 w-4" />, t: "위치 확인 — 부산 동래구 명륜동" },
                { ic: <Users className="h-4 w-4" />, t: "막내딸 김미경에게 알림 전송" },
                { ic: <Users className="h-4 w-4" />, t: "큰아들 김민수에게 알림 전송" },
                { ic: <Users className="h-4 w-4" />, t: "큰며느리 박수영에게 알림 전송" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-dashed border-gt-line py-2.5 last:border-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${sosStage > i ? "bg-gt-sage text-white" : "bg-gt-coralLight text-gt-coralDeep"}`}>
                    {sosStage > i ? "✓" : i + 1}
                  </span>
                  <span className="flex-1 text-[13px] text-gt-ink">{s.t}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2.5">
              <button onClick={() => setSosOpen(false)} className="flex-1 rounded-2xl bg-gt-paper2 py-3.5 font-semibold text-gt-ink">취소</button>
              <button disabled={sosStage < 4} onClick={() => { setSosOpen(false); showToast("🚨 119에 자동 호출되었어요"); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-danger py-3.5 font-semibold text-white disabled:opacity-40">
                <Phone className="h-4 w-4" /> 119 호출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 animate-rise rounded-2xl bg-gt-ink px-5 py-3.5 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}

/* ---------- sub-components ---------- */
type Tone = "coral" | "sage" | "gold" | "terra";

interface QuickBtnProps {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: Tone;
  badge?: string;
  href?: string;
  onClick?: () => void;
}
function QuickBtn({ icon: Icon, label, sub, color, badge, href, onClick }: QuickBtnProps) {
  const bg: Record<Tone, string> = { coral: "bg-gt-coralLight text-gt-coralDeep", sage: "bg-gt-sageLight text-gt-sage", gold: "bg-gt-goldSoft text-gt-gold", terra: "bg-[#F0DBC9] text-gt-terra" };
  const inner = (
    <div className="relative flex flex-col items-center gap-2 rounded-[22px] border border-gt-line bg-white/70 px-1 py-4 backdrop-blur active:scale-95 transition-transform" style={{ boxShadow: "0 4px 16px rgba(40,30,20,0.06)" }}>
      {badge && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-gt-cream bg-gt-coral px-1 text-[10px] font-bold text-white">{badge}</span>}
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg[color]}`}><Icon className="h-5 w-5" /></span>
      <span className="text-sm font-semibold text-gt-ink">{label}</span>
      <span className="-mt-1 text-[10px] text-gt-muted">{sub}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <button onClick={onClick} className="w-full">{inner}</button>;
}

interface GrandchildCardProps {
  name: string;
  age: string;
  badge: string;
  tone: "jiyun" | "siwoo";
  quote: string;
  onClick?: () => void;
}
function GrandchildCard({ name, age, badge, tone, quote, onClick }: GrandchildCardProps) {
  const grad = tone === "jiyun"
    ? "linear-gradient(160deg,#FFCDB5,#FFA47A,#E08056)"
    : "linear-gradient(160deg,#D7EBD9,#92BC9E,#6B8B76)";
  const emoji = tone === "jiyun" ? "🎀" : "⚽";
  const video = badge.includes("영상");
  return (
    <button onClick={onClick} className="overflow-hidden rounded-[22px] bg-white text-left active:scale-[0.97] transition-transform" style={{ boxShadow: "0 4px 16px rgba(40,30,20,0.06)" }}>
      <div className="relative flex h-32 items-center justify-center" style={{ background: grad }}>
        <span className="text-5xl drop-shadow-lg">{emoji}</span>
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.45))" }} />
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${video ? "bg-gt-coral text-white" : "bg-white/95 text-gt-coralDeep"}`}>{badge}</span>
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <div className="font-serif text-sm font-bold">{name}</div>
          <div className="font-display italic text-[11px] opacity-85">{age}</div>
        </div>
      </div>
      <div className="bg-white p-3.5"><p className="line-clamp-2 font-serif text-[13px] leading-snug text-gt-ink">&ldquo;{quote}&rdquo;</p></div>
    </button>
  );
}

interface PolaroidProps {
  scene: "jiyun" | "sunset" | "wedding";
  date: string;
  caption: string;
  rot: number;
}
function Polaroid({ scene, date, caption, rot }: PolaroidProps) {
  const scenes: Record<PolaroidProps["scene"], React.ReactNode> = {
    jiyun: <div className="flex h-full items-end justify-center" style={{ background: "linear-gradient(180deg,#FFE5C2,#FFD0A8)" }}><span className="mb-4 text-6xl drop-shadow">👶</span></div>,
    sunset: <div className="h-full" style={{ background: "radial-gradient(ellipse at 70% 30%,#FFD56B 0%,transparent 50%),linear-gradient(180deg,#FFC09A,#E08056 60%,#7A4838)" }} />,
    wedding: <div className="flex h-full items-center justify-center" style={{ background: "linear-gradient(180deg,#F5E5E8,#E8C5D0)" }}><span className="text-5xl drop-shadow">💐</span></div>,
  };
  return (
    <div className="w-52 shrink-0 rounded bg-white p-3.5 pb-12" style={{ transform: `rotate(${rot}deg)`, boxShadow: "0 8px 24px rgba(40,30,20,0.18)" }}>
      <div className="aspect-square overflow-hidden rounded-sm">{scenes[scene]}</div>
      <p className="mt-3 text-center font-display text-[10px] tracking-[0.18em] text-gt-muted">{date}</p>
      <p className="mt-0.5 text-center font-display italic text-sm text-gt-inkSoft">{caption}</p>
    </div>
  );
}
