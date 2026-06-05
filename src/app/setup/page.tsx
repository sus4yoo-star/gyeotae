"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, AlertCircle, UserPlus, KeyRound, Check, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmovFooter } from "@/components/amov-footer";
import { useCircleState, createCircle, joinCircle } from "@/lib/circle";
import type { CareCircle } from "@/lib/types";

type Mode = "create" | "join";

export default function SetupPage() {
  const router = useRouter();
  const { status } = useCircleState();
  const [mode, setMode] = useState<Mode>("create");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CareCircle | null>(null);
  const [copied, setCopied] = useState(false);

  // create fields
  const [parentName, setParentName] = useState("");
  const [parentAge, setParentAge] = useState("");
  const [parentLocation, setParentLocation] = useState("");
  const [displayName, setDisplayName] = useState("");
  // join fields
  const [code, setCode] = useState("");

  // Already in a circle → nothing to set up.
  useEffect(() => { if (status === "ready") router.replace("/family"); }, [status, router]);

  if (status === "loading") {
    return (
      <main className="gt-aurora flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gt-coral" />
      </main>
    );
  }

  if (status === "demo") {
    return (
      <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center px-5 py-10 text-center">
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-gt-line bg-white/80 p-7 backdrop-blur-xl">
          <h1 className="font-serif text-xl font-bold text-gt-ink">로그인 후 이용할 수 있어요</h1>
          <p className="mt-2 text-sm leading-relaxed text-gt-muted">
            가족 모임을 만들거나 합류하려면 먼저 로그인이 필요해요.
          </p>
          <Button asChild variant="coral" className="mt-5 w-full">
            <Link href="/login?next=/setup">로그인하러 가기 <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Link href="/home" className="mt-4 block text-xs text-gt-mutedLight underline">로그인 없이 둘러보기</Link>
        </div>
      </main>
    );
  }

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      if (mode === "create") {
        if (!parentName.trim()) { setErr("부모님 성함을 입력해주세요."); setLoading(false); return; }
        const ageNum = parentAge.trim() ? Number(parentAge) : null;
        if (parentAge.trim() && (Number.isNaN(ageNum) || ageNum! < 0 || ageNum! > 130)) {
          setErr("나이를 올바르게 입력해주세요."); setLoading(false); return;
        }
        const circle = await createCircle({
          parent_name: parentName.trim(),
          parent_age: ageNum,
          parent_location: parentLocation.trim() || null,
          display_name: displayName.trim() || undefined,
        });
        setCreated(circle);
      } else {
        if (code.trim().length < 4) { setErr("초대코드를 확인해주세요."); setLoading(false); return; }
        await joinCircle(code, displayName.trim() || undefined);
        router.replace("/family");
        return;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    }
    setLoading(false);
  };

  const copyCode = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // Success: circle created — show the invite code to share with siblings.
  if (created) {
    return (
      <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <div className="relative z-10 w-full max-w-[26rem] animate-rise rounded-3xl border border-gt-line bg-white/85 p-7 text-center shadow-[0_24px_80px_rgba(40,30,20,0.12)] backdrop-blur-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gt-sageLight">
            <Check className="h-7 w-7 text-gt-sage" strokeWidth={3} />
          </div>
          <h1 className="font-serif text-xl font-bold text-gt-ink">{created.parent_name} 님의 곁에가 열렸어요</h1>
          <p className="mt-2 text-sm leading-relaxed text-gt-muted">
            아래 초대코드를 다른 가족에게 알려주세요.<br />같은 모임에서 함께 부모님 곁을 지킬 수 있어요.
          </p>
          <button onClick={copyCode}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border-[1.5px] border-dashed border-gt-coral/50 bg-gt-coralSoft px-5 py-4">
            <span className="font-display text-3xl font-bold tracking-[0.3em] text-gt-coralDeep">{created.invite_code.toUpperCase()}</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gt-coral">
              {copied ? <><Check className="h-4 w-4" /> 복사됨</> : <><Copy className="h-4 w-4" /> 복사</>}
            </span>
          </button>
          <Button asChild variant="coral" className="mt-6 w-full">
            <Link href="/family">가족 화면으로 <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <AmovFooter />
        </div>
      </main>
    );
  }

  return (
    <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="relative z-10 w-full max-w-[26rem] animate-rise rounded-3xl border border-gt-line bg-white/80 p-7 shadow-[0_24px_80px_rgba(40,30,20,0.12)] backdrop-blur-xl">
        <div className="mb-5 flex flex-col items-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-lg shadow-gt-coral/30">
            <Heart className="h-6 w-6 text-white" fill="white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gt-ink">가족 모임 만들기</h1>
          <p className="mt-1 text-center text-sm leading-relaxed text-gt-muted">
            부모님을 등록하거나, 받은 초대코드로 합류하세요
          </p>
        </div>

        {/* mode toggle */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-gt-paper p-1.5">
          {([["create", "부모님 등록", UserPlus], ["join", "초대코드 합류", KeyRound]] as const).map(([m, label, Icon]) => (
            <button key={m} onClick={() => { setMode(m); setErr(null); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${
                mode === m ? "bg-white text-gt-coral shadow-sm" : "text-gt-muted"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {mode === "create" ? (
          <div className="space-y-3">
            <Field label="부모님 성함" value={parentName} onChange={setParentName} placeholder="예: 이옥자" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <Field label="나이 (선택)" value={parentAge} onChange={setParentAge} placeholder="72" inputMode="numeric" />
              <Field label="지역 (선택)" value={parentLocation} onChange={setParentLocation} placeholder="부산 동래구" />
            </div>
            <Field label="내 호칭 (선택)" value={displayName} onChange={setDisplayName} placeholder="예: 막내딸 미경" />
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="초대코드" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="6자리 코드" autoFocus
              className="text-center font-display text-lg tracking-[0.3em]" />
            <Field label="내 호칭 (선택)" value={displayName} onChange={setDisplayName} placeholder="예: 큰아들 민수" />
          </div>
        )}

        {err && (
          <div className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-gt-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{err}</span>
          </div>
        )}

        <Button variant="coral" className="mt-5 w-full" onClick={submit} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "처리 중..." : mode === "create" ? "모임 만들기" : "모임 합류하기"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>

        <Link href="/home" className="mt-5 block text-center text-xs text-gt-mutedLight underline">나중에 하기</Link>
        <AmovFooter />
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus, inputMode, className }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  autoFocus?: boolean; inputMode?: "numeric" | "text"; className?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-gt-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        className={`w-full rounded-2xl border-[1.5px] border-gt-line bg-white px-4 py-3 font-serif text-[15px] outline-none focus:border-gt-coral ${className ?? ""}`}
      />
    </label>
  );
}
