"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, Video, Send, ShieldPlus, CheckCircle2, Circle, Heart, UserPlus, UserMinus, Shield, ArrowRight, Smartphone, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { PushManager } from "@/components/push-manager";
import { MedicalCard } from "@/components/medical-card";
import { MedicationStatusCard } from "@/components/medication-tracker";
import { Button } from "@/components/ui/button";
import { useCircleState, useCircleEvents, useCircleMembers, updateMemberRole, removeMember, signOut } from "@/lib/circle";
import { useParentMode } from "@/lib/device";
import type { CareEvent, CircleMember, CareCircle } from "@/lib/types";

export default function FamilyDashboard() {
  const router = useRouter();
  const [parentMode, setParentMode] = useParentMode();
  const { circle, status } = useCircleState();
  const events = useCircleEvents(circle?.id);
  const { members, meId, reload } = useCircleMembers(circle?.id);
  const [warmth, setWarmth] = useState(67);
  const [toast, setToast] = useState<string | null>(null);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  // This device is locked to the parent view — keep it on /home.
  useEffect(() => { if (parentMode) router.replace("/home"); }, [parentMode, router]);

  const toggleRole = async (m: CircleMember) => {
    const next = m.role === "admin" ? "member" : "admin";
    try {
      await updateMemberRole(m.id, next);
      showToast(next === "admin" ? `${m.display_name || "가족"} 님을 관리자로 지정했어요` : `${m.display_name || "가족"} 님을 일반 구성원으로 변경했어요`);
      reload();
    } catch { showToast("권한 변경에 실패했어요"); }
  };
  const kickMember = async (m: CircleMember) => {
    if (!window.confirm(`${m.display_name || "이 가족"} 님을 모임에서 내보낼까요?`)) return;
    try { await removeMember(m.id); showToast(`${m.display_name || "가족"} 님을 내보냈어요`); reload(); }
    catch { showToast("내보내기에 실패했어요"); }
  };
  const bump = (n: number) => { if (!liveWarmth) setWarmth((w) => Math.min(100, w + n)); showToast(`💛 온기 점수가 +${n} 올랐어요`); };

  const demoWeek = [14, 24, 42, 18, 30, 22, 46];
  const demoDays = ["금", "토", "일", "월", "화", "수", "오늘"];
  const parentName = circle?.parent_name || "이옥자";
  const myName = members.find((m) => m.user_id === meId)?.display_name || "미경";
  const iAmAdmin = !!circle && (members.find((m) => m.user_id === meId)?.role === "admin" || circle.owner_id === meId);
  const ps = parentStatus(events, circle);

  // Real warmth from this week's activity (null in demo mode → keep demo card).
  const liveWarmth = useMemo(
    () => (events ? warmthFrom(events, members, myName) : null),
    [events, members, myName],
  );
  const warmthScore = liveWarmth ? liveWarmth.score : warmth;
  const statRows: [string, string][] = liveWarmth
    ? liveWarmth.stats
    : [["3", "개의 메시지"], ["1", "번의 음성 통화"], ["2", "장의 사진 공유"], ["3", "명의 가족이 닿음"]];
  const bars = liveWarmth
    ? liveWarmth.bars
    : demoWeek.map((h, i) => ({ h, label: demoDays[i], today: i === demoWeek.length - 1 }));

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
            <button onClick={() => { if (window.confirm("로그아웃 할까요?")) signOut(); }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-gt-mutedLight underline">
              <LogOut className="h-3.5 w-3.5" /> 다른 계정으로 로그인
            </button>
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
                <h1 className="mb-1 font-serif text-3xl text-gt-ink">{myName} 님, 안녕하세요</h1>
                <p className="text-sm text-gt-muted"><strong className="text-gt-coral">{parentName} 어머니</strong>의 곁에를 지키고 있어요</p>
              </div>
              <PushManager circleId={circle?.id} />
            </div>
            {circle && <InviteChip code={circle.invite_code} onCopied={() => showToast("📋 초대코드를 복사했어요")} />}
          </header>

          {/* 로그인 안 됨: 지금 화면은 가짜 데모 데이터라는 걸 분명히 알려준다 */}
          {status === "demo" && (
            <section className="px-5 pb-1">
              <Link href="/login" className="flex items-center justify-between gap-3 rounded-2xl border border-gt-gold/40 bg-gt-goldSoft px-4 py-3 active:scale-[0.99] transition-transform">
                <span className="text-[13px] leading-snug text-gt-ink">
                  지금은 <strong className="text-gt-gold">둘러보기(데모)</strong> 화면이에요.<br />
                  <span className="text-gt-muted">로그인하면 진짜 우리 가족 모임이 보여요.</span>
                </span>
                <span className="shrink-0 rounded-full bg-gt-ink px-3.5 py-2 text-xs font-semibold text-white">로그인</span>
              </Link>
            </section>
          )}

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
                  <div className="font-display text-[56px] font-medium leading-none text-gt-coral">{warmthScore}</div>
                  <div className="font-display italic text-sm text-gt-muted">/ 100</div>
                </div>
              </div>

              <div className="relative my-4 flex items-center gap-4">
                <div className="h-[72px] w-[72px] shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <defs><clipPath id="hc"><path d="M50,88 C50,88 12,62 12,38 C12,24 22,16 32,16 C40,16 46,20 50,28 C54,20 60,16 68,16 C78,16 88,24 88,38 C88,62 50,88 50,88 Z" /></clipPath></defs>
                    <rect x="0" y="0" width="100" height="100" fill="#FBEEE0" clipPath="url(#hc)" />
                    <rect x="0" y={100 - warmthScore} width="100" height={warmthScore} fill="#DC6B4A" clipPath="url(#hc)" style={{ transition: "all 0.8s ease" }} />
                  </svg>
                </div>
                <div className="flex-1 space-y-1">
                  {statRows.map(([n, t], i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gt-inkSoft">
                      <span className="h-1.5 w-1.5 rounded-full bg-gt-coral" />
                      <span className="font-display text-sm font-semibold text-gt-coral">{n}</span>{t}
                    </div>
                  ))}
                </div>
              </div>

              {/* weekly trend */}
              <div className="flex items-end justify-between gap-1.5 border-t border-gt-line pt-3.5">
                {bars.map((b, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className={`w-full rounded ${b.today ? "bg-gt-coral" : "bg-gt-coralSoft"}`} style={{ height: b.h }} />
                    <span className={`font-display text-[10px] ${b.today ? "font-bold not-italic text-gt-coral" : "italic text-gt-muted"}`}>{b.label}</span>
                  </div>
                ))}
              </div>

              <p className="mt-3.5 border-t border-dashed border-gt-line pt-3.5 text-xs leading-relaxed text-gt-inkSoft">
                {liveWarmth ? (
                  liveWarmth.active ? (
                    <>이번 주 가장 따뜻한 사람: <strong className="text-gt-coral">{liveWarmth.topName}{liveWarmth.topName === myName ? " (당신)" : ""}</strong>.<br />오늘도 부모님께 안부 한마디 전해보세요.</>
                  ) : (
                    <>아직 이번 주 활동이 없어요.<br /><strong className="text-gt-coral">{parentName} 어머니</strong>께 첫 안부를 전해보세요 💛</>
                  )
                ) : (
                  <>이번 주 어머니께 가장 따뜻한 사람: <strong className="text-gt-coral">막내딸 미경 (당신)</strong>.<br />주말에 형제자매께 안부를 청해보세요.</>
                )}
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
                  <p className="font-serif text-[15px] text-gt-ink">{ps.headline}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gt-line">
                <StatusCell label="AI MORNING CALL" value={ps.call.value} sub={ps.call.sub} ok={ps.call.ok} />
                <StatusCell label="MEAL · 식사" value={ps.meal.value} sub={ps.meal.sub} ok={ps.meal.ok} />
                <StatusCell label="LAST ACTIVITY" value={ps.activity.value} sub={ps.activity.sub} ok={ps.activity.ok} />
                <StatusCell label="LOCATION" value={ps.location.value} sub={ps.location.sub} ok={ps.location.ok} />
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

          {/* 함께하는 가족 (실제 모임 구성원) */}
          {members.length > 0 && (
            <section className="mt-5 px-5">
              <div className="gt-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-gt-line px-5 py-4">
                  <span className="font-serif text-base text-gt-ink">함께하는 가족</span>
                  <span className="rounded-full bg-gt-sageSoft px-2.5 py-1 font-display italic text-xs text-gt-sage">{members.length}명</span>
                </div>
                <div className="divide-y divide-gt-line">
                  {members.map((m) => (
                    <MemberRow key={m.id} m={m} isMe={m.user_id === meId}
                      isOwner={m.user_id === circle?.owner_id}
                      canManage={iAmAdmin && m.user_id !== meId && m.user_id !== circle?.owner_id}
                      onToggleRole={() => toggleRole(m)} onRemove={() => kickMember(m)} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Activity feed */}
          <section className="mt-5 px-5">
            <div className="gt-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-gt-line px-5 py-4">
                <span className="font-serif text-base text-gt-ink">실시간 활동</span>
                <span className="rounded-full bg-gt-coralSoft px-2.5 py-1 font-display italic text-xs text-gt-coral">
                  {events === null ? "3건" : `${events.length}건`}
                </span>
              </div>
              <div className="divide-y divide-gt-line">
                {events === null ? (
                  <>
                    <FeedItem emoji="🎙️" text={<>어머니가 <strong className="text-gt-coral">&quot;첫 직장 이야기&quot;</strong>를 음성으로 기록하셨어요 (3분 12초)</>} time="8분 전" />
                    <FeedItem emoji="🎬" text={<>어머니가 손녀 <strong className="text-gt-coral">지윤이의 영상</strong>을 보셨어요</>} time="35분 전" />
                    <FeedItem emoji="✓" text={<>AI 모닝콜에 응답 — <strong className="text-gt-coral">&quot;잘 잤어요, 오늘 비온대&quot;</strong></>} time="today, 7:31 AM" />
                  </>
                ) : events.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm leading-relaxed text-gt-muted">
                    아직 활동이 없어요.<br />부모님이 SOS를 누르거나 약을 체크하면 여기에 바로 나타나요.
                  </p>
                ) : (
                  events.map((e) => {
                    const d = eventDisplay(e);
                    return <FeedItem key={e.id} emoji={d.emoji} text={d.text} time={relativeTime(e.created_at)} />;
                  })
                )}
              </div>
            </div>
          </section>

          {/* 부모님 기기로 설정 */}
          <section className="mt-5 px-5">
            <button
              onClick={() => { setParentMode(true); showToast("📱 이 기기를 부모님 기기로 설정했어요"); router.replace("/home"); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-gt-line bg-white/60 px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gt-sageLight text-gt-sage"><Smartphone className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /></span>
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-gt-ink">이 기기를 부모님 기기로 설정</span>
                <span className="block text-[11px] leading-snug text-gt-muted">부모님 화면만 보이고, 자녀 화면·관리 메뉴는 숨겨져요</span>
              </span>
            </button>
          </section>

          {/* 로그아웃 (로그인 상태에서만) */}
          {status !== "demo" && (
            <section className="mt-3 px-5 pb-2">
              <button
                onClick={() => { if (window.confirm("로그아웃 할까요?")) signOut(); }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gt-line bg-white/60 px-4 py-3 text-[13px] font-semibold text-gt-muted active:scale-[0.99] transition-transform"
              >
                <LogOut className="h-4 w-4" /> 로그아웃
              </button>
            </section>
          )}
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

const EVENT_EMOJI: Record<string, string> = {
  sos: "🚨", med: "💊", meal: "🍚", checkin: "✓", silence: "🔕", memoir: "🎙️", message: "💬", video: "🎬",
};
function eventDisplay(e: CareEvent): { emoji: string; text: React.ReactNode } {
  return { emoji: EVENT_EMOJI[e.type] || "💛", text: e.message || "활동이 기록되었어요" };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const TYPE_LABEL: Record<string, string> = {
  sos: "긴급 SOS", med: "복약", checkin: "모닝콜", meal: "식사",
  memoir: "이야기 기록", message: "메시지", video: "영상", silence: "무응답",
};

type Cell = { value: string; sub: string; ok: boolean };
type ParentStatus = { headline: string; call: Cell; meal: Cell; activity: Cell; location: Cell };

/** Derives the "오늘 부모님 상태" card from real events. Falls back to the
 *  demo snapshot when there's no circle (events === null). */
function parentStatus(events: CareEvent[] | null, circle: CareCircle | null): ParentStatus {
  if (events === null) {
    return {
      headline: "평안하세요. 모닝콜 응답 완료, 활동 정상",
      call: { value: "응답 완료", sub: "today, 7:30 AM", ok: true },
      meal: { value: "아침 드심", sub: "today, 8:05 AM", ok: true },
      activity: { value: "방금", sub: "phone activity", ok: true },
      location: { value: "자택", sub: "Busan, 동래구", ok: true },
    };
  }
  const today = events.filter((e) => isToday(e.created_at));
  const checkin = today.find((e) => e.type === "checkin");
  const meals = today.filter((e) => e.type === "meal");
  const sos = today.find((e) => e.type === "sos");
  const latest = events[0];
  const loc = circle?.parent_location?.trim();

  const call: Cell = checkin
    ? { value: "응답 완료", sub: `오늘 ${hhmm(checkin.created_at)}`, ok: true }
    : { value: "대기 중", sub: "오늘 안부 전", ok: false };
  const meal: Cell = meals.length
    ? { value: `${meals.length}끼 드심`, sub: `최근 ${hhmm(meals[0].created_at)}`, ok: true }
    : { value: "기록 없음", sub: "오늘 식사 전", ok: false };
  const activity: Cell = latest
    ? { value: relativeTime(latest.created_at), sub: TYPE_LABEL[latest.type] || "활동", ok: true }
    : { value: "기록 없음", sub: "오늘 활동 없음", ok: false };
  const location: Cell = loc
    ? { value: loc, sub: "등록된 지역", ok: true }
    : { value: "미설정", sub: "지역 미등록", ok: false };

  const headline = sos ? "🚨 SOS 발생 — 지금 확인해주세요"
    : call.ok ? "안부 확인 완료, 평안하세요"
    : "오늘 안부를 기다리고 있어요";
  return { headline, call, meal, activity, location };
}

type WarmthData = {
  score: number;
  bars: { h: number; label: string; today: boolean }[];
  stats: [string, string][];
  topName: string;
  active: boolean;
};

/** Derives the warmth card from this week's real care events. */
function warmthFrom(events: CareEvent[], members: CircleMember[], myName: string): WarmthData {
  const DAY = 86_400_000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = today.getTime() - 6 * DAY;
  const counts = new Array(7).fill(0);
  const wk: CareEvent[] = [];
  for (const e of events) {
    const d = new Date(e.created_at); d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - start) / DAY);
    if (idx >= 0 && idx < 7) { counts[idx]++; wk.push(e); }
  }
  const max = Math.max(1, ...counts);
  const wd = ["일", "월", "화", "수", "목", "금", "토"];
  const bars = counts.map((c, i) => ({
    h: 6 + Math.round((c / max) * 40),
    label: i === 6 ? "오늘" : wd[new Date(start + i * DAY).getDay()],
    today: i === 6,
  }));
  const n = (t: string) => wk.filter((e) => e.type === t).length;
  const stats: [string, string][] = [
    [String(wk.length), "번의 따뜻한 활동"],
    [String(n("checkin")), "번의 안부 응답"],
    [String(n("med")), "번의 복약 체크"],
    [String(members.length), "명의 가족이 함께"],
  ];
  const tally: Record<string, number> = {};
  for (const e of wk) if (e.created_by) tally[e.created_by] = (tally[e.created_by] || 0) + 1;
  let topName = myName, top = 0;
  for (const [uid, c] of Object.entries(tally)) {
    if (c > top) { top = c; topName = members.find((m) => m.user_id === uid)?.display_name || myName; }
  }
  return { score: Math.min(100, wk.length * 12), bars, stats, topName, active: wk.length > 0 };
}

interface MemberRowProps {
  m: CircleMember; isMe: boolean; isOwner: boolean; canManage: boolean;
  onToggleRole: () => void; onRemove: () => void;
}
function MemberRow({ m, isMe, isOwner, canManage, onToggleRole, onRemove }: MemberRowProps) {
  const name = m.display_name || "가족";
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold font-serif text-sm font-bold text-white">
        {name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-gt-ink">
          {name}{isMe && <span className="ml-1 text-[11px] font-normal text-gt-muted">(나)</span>}
        </p>
        <p className="text-[11px] text-gt-muted">{m.relation || "가족"}</p>
      </div>
      {(isOwner || m.role === "admin") && (
        <span className="rounded-full bg-gt-coralSoft px-2 py-0.5 text-[10px] font-semibold text-gt-coral">{isOwner ? "소유자" : "관리자"}</span>
      )}
      {canManage && (
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleRole} title={m.role === "admin" ? "관리자 해제" : "관리자 지정"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-paper2 text-gt-muted active:scale-95">
            <Shield className={`h-3.5 w-3.5 ${m.role === "admin" ? "text-gt-coral" : ""}`} />
          </button>
          <button onClick={onRemove} title="내보내기"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-dangerSoft text-gt-danger active:scale-95">
            <UserMinus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
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
