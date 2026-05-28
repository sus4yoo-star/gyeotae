"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Heart, Loader2, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmovFooter } from "@/components/amov-footer";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/client";

/** Polls getSession() until cookies are actually readable. Prevents the
 *  classic "have to log in twice" race after password/OTP exchange. */
async function waitForSession(supabase: any, timeoutMs = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(
    errorParam === "auth" ? "로그인이 만료되었어요. 다시 시도해주세요."
    : errorParam === "config" ? "서버 설정 문제가 있어요. 잠시 후 다시 시도해주세요."
    : null
  );

  const configured = isSupabaseEnabled();
  const demoMode = !configured;

  const oauth = useCallback(async (provider: "google" | "kakao") => {
    setErr(null);
    if (demoMode) { window.location.href = "/home"; return; }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: provider === "kakao" ? "profile_nickname account_email" : undefined,
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) { setErr(error.message); setLoading(false); }
    // On success the browser is redirected to the OAuth provider.
  }, [demoMode, next]);

  const sendMagicLink = useCallback(async () => {
    setErr(null);
    if (demoMode) { window.location.href = "/home"; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("올바른 이메일 주소를 입력해주세요."); return;
    }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    if (error) setErr("메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.");
    else setSent(true);
  }, [demoMode, email, next]);

  return (
    <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-5 py-10 gt-scroll">
      <div className="relative z-10 w-full max-w-[26rem] animate-rise rounded-3xl border border-gt-line bg-white/80 p-7 shadow-[0_24px_80px_rgba(40,30,20,0.12)] backdrop-blur-xl">
        {/* Brand */}
        <div className="mb-5 flex flex-col items-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
            <span className="absolute h-20 w-20 animate-breathe rounded-full bg-gt-coral/15 blur-2xl" aria-hidden />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-lg shadow-gt-coral/30">
              <Heart className="h-6 w-6 text-white" fill="white" />
            </div>
          </div>
          <h1 className="font-serif text-2xl font-bold text-gt-ink">곁에</h1>
          <p className="mt-0.5 font-display italic text-[11px] tracking-[0.18em] text-gt-terra">GYEOTAE</p>
        </div>

        <h2 className="mb-1.5 text-center font-serif text-[17px] leading-snug text-gt-ink">
          가족의 곁을 지키러 오신 것을 환영해요
        </h2>
        <p className="mb-6 text-center text-sm leading-relaxed text-gt-muted">
          평소 쓰시는 계정으로 빠르게 시작하세요
        </p>

        {sent ? (
          <div className="rounded-2xl bg-gt-coralSoft p-5 text-center">
            <Mail className="mx-auto mb-2 h-7 w-7 text-gt-coral" />
            <p className="font-serif text-base text-gt-ink">메일을 확인해주세요</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gt-muted">
              <strong className="text-gt-coral">{email}</strong> 으로 로그인 링크를 보냈어요.<br/>메일의 버튼을 누르면 바로 시작됩니다.
            </p>
          </div>
        ) : (
          <>
            {/* Google */}
            <Button
              variant="outline"
              className="mb-2.5 w-full justify-center bg-white"
              onClick={() => oauth("google")}
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1A6.2 6.2 0 0 1 12 5.8a5.6 5.6 0 0 1 3.96 1.55l2.7-2.6A9.9 9.9 0 0 0 12 2a10 10 0 1 0 0 20c5.77 0 9.6-4.06 9.6-9.78 0-.66-.07-1.16-.16-1.66H12z"/>
              </svg>
              구글로 시작하기
            </Button>

            {/* Kakao */}
            <button
              type="button"
              onClick={() => oauth("kakao")}
              disabled={loading}
              className="mb-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-[14px] font-semibold text-[#191919] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 256 256" aria-hidden>
                <path fill="#191919" d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434.689.405 1.49.434 2.184.151.703-.281 25.354-16.563 39.658-26.005 7.336 1.063 14.99 1.62 22.057 1.62 57.438 0 104-36.713 104-82S185.438 36 128 36z"/>
              </svg>
              카카오로 시작하기
            </button>

            {/* divider */}
            <div className="mb-4 flex items-center gap-3 font-display text-[10px] uppercase tracking-[0.2em] text-gt-mutedLight">
              <span className="h-px flex-1 bg-gt-line" />
              <span>또는 이메일</span>
              <span className="h-px flex-1 bg-gt-line" />
            </div>

            {!demoMode && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && sendMagicLink()}
                placeholder="이메일 주소"
                className="mb-3 w-full rounded-2xl border-[1.5px] border-gt-line bg-white px-5 py-3.5 font-serif text-[15px] outline-none focus:border-gt-coral"
              />
            )}

            {err && (
              <div className="mb-3 flex items-start gap-2 text-[13px] leading-relaxed text-gt-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <Button
              variant="coral"
              className="w-full"
              onClick={sendMagicLink}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "보내는 중..." : demoMode ? "둘러보기로 시작" : "이메일로 로그인 링크 받기"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            {demoMode && (
              <p className="mt-4 rounded-xl bg-gt-paper px-3 py-2.5 text-center text-[11px] leading-relaxed text-gt-muted">
                아직 Supabase가 연결되지 않아 둘러보기 모드예요.<br/>SETUP.md의 안내로 로그인을 켤 수 있어요.
              </p>
            )}
          </>
        )}

        <Link href="/home" className="mt-5 block text-center text-xs text-gt-mutedLight underline">
          로그인 없이 둘러보기
        </Link>

        <AmovFooter />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="gt-aurora flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gt-coral" />
      </main>
    }>
      <LoginInner />
    </Suspense>
  );
}
