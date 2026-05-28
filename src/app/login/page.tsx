"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmovFooter } from "@/components/amov-footer";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const supabase = createClient();
  const demoMode = !supabase;

  async function signIn() {
    setErr("");
    if (demoMode) {
      // No Supabase configured yet → continue into the app in demo mode.
      window.location.href = "/home";
      return;
    }
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setErr("메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.");
    else setSent(true);
  }

  return (
    <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center gt-scroll">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute h-28 w-28 animate-breathe rounded-full bg-gt-coral/15 blur-2xl" aria-hidden />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-2xl shadow-gt-coral/30">
            <Heart className="h-9 w-9 text-white" fill="white" />
          </div>
        </div>
        <h1 className="mb-1 font-serif text-4xl font-bold text-gt-ink">곁에</h1>
        <p className="mb-8 text-sm text-gt-muted">가족의 곁을 지키러 오신 것을 환영해요</p>

        {sent ? (
          <div className="gt-card w-full p-7 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-gt-coral" />
            <p className="font-serif text-lg text-gt-ink">메일을 확인해주세요</p>
            <p className="mt-2 text-sm leading-relaxed text-gt-muted">
              <strong className="text-gt-coral">{email}</strong> 으로<br />로그인 링크를 보냈어요. 메일의 버튼을 누르면 바로 시작됩니다.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {!demoMode && (
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                placeholder="이메일 주소"
                className="mb-3 w-full rounded-2xl border-[1.5px] border-gt-line bg-white px-5 py-4 font-serif text-[16px] outline-none focus:border-gt-coral"
              />
            )}
            {err && <p className="mb-3 text-sm text-gt-danger">{err}</p>}
            <Button variant="coral" size="lg" className="w-full" onClick={signIn} disabled={loading}>
              {loading ? "보내는 중..." : demoMode ? "둘러보기로 시작" : "이메일로 로그인"} <ArrowRight className="h-4 w-4" />
            </Button>
            {demoMode && (
              <p className="mt-4 text-xs leading-relaxed text-gt-mutedLight">
                아직 Supabase가 연결되지 않아 둘러보기 모드예요.<br />README의 안내로 로그인을 켤 수 있어요.
              </p>
            )}
          </div>
        )}

        <Link href="/home" className="mt-6 text-xs text-gt-mutedLight underline">로그인 없이 둘러보기</Link>
        <AmovFooter />
      </div>
    </main>
  );
}
