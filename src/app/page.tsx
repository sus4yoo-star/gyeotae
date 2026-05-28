"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmovFooter } from "@/components/amov-footer";

export default function IntroPage() {
  return (
    <main className="gt-aurora relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center gt-scroll">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Breathing brand mark */}
        <div className="relative mb-7 flex h-24 w-24 items-center justify-center animate-fade-in">
          <span className="absolute h-32 w-32 animate-breathe rounded-full bg-gt-coral/15 blur-2xl" aria-hidden />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-2xl shadow-gt-coral/30">
            <Heart className="h-11 w-11 text-white" fill="white" />
          </div>
        </div>

        <p className="mb-3 font-display italic text-sm tracking-[0.2em] text-gt-terra animate-rise" style={{ animationDelay: "0.05s" }}>
          A · M · O · V
        </p>
        <h1 className="mb-2 font-serif text-6xl font-bold tracking-tight text-gt-ink animate-rise" style={{ animationDelay: "0.1s" }}>
          곁에
        </h1>
        <p className="mb-8 font-display italic text-base tracking-[0.15em] text-gt-terra animate-rise" style={{ animationDelay: "0.16s" }}>
          GYEOTAE
        </p>

        <p className="mb-8 font-serif text-2xl leading-relaxed text-gt-ink animate-rise" style={{ animationDelay: "0.22s" }}>
          혼자 계셔도,<br />혼자가 아닙니다
        </p>

        <p className="mb-9 max-w-xs text-[15px] leading-relaxed text-gt-muted animate-rise" style={{ animationDelay: "0.3s" }}>
          가족이 일하는 동안, 곁에가 부모님 곁을 지킵니다. 멀리 있어도 사랑은 닿습니다.
        </p>

        <Button asChild variant="coral" size="lg" className="w-full max-w-xs animate-rise" style={{ animationDelay: "0.38s" }}>
          <Link href="/login">곁에 시작하기 <ArrowRight className="h-4 w-4" /></Link>
        </Button>

        <p className="mt-6 text-xs text-gt-mutedLight animate-rise" style={{ animationDelay: "0.46s" }}>
          이미 1,200+ 가족이 함께하고 있어요
        </p>

        <AmovFooter />
      </div>
    </main>
  );
}
