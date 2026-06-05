"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/**
 * Splash — the first thing users see on cold load. Fades out after a beat.
 * Mirrors the MANNA/SELAH splash pattern: a breathing brand mark over the
 * warm aurora, then dissolves into the app.
 */
export function Splash() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Show the brand moment once per browser session, not on every navigation/reload.
    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem("gt-splashed") === "1"; } catch {}
    if (alreadyShown) { setHide(true); setGone(true); return; }
    try { sessionStorage.setItem("gt-splashed", "1"); } catch {}
    const t1 = setTimeout(() => setHide(true), 1600);
    const t2 = setTimeout(() => setGone(true), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`gt-aurora fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ${
        hide ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
          <span className="absolute h-32 w-32 animate-breathe rounded-full bg-gt-coral/15 blur-2xl" aria-hidden />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gt-coral to-gt-gold shadow-2xl shadow-gt-coral/30">
            <Heart className="h-11 w-11 text-white" fill="white" />
          </div>
        </div>
        <p className="mb-4 font-display italic text-sm tracking-[0.2em] text-gt-terra">A · M · O · V</p>
        <h1 className="font-serif text-6xl font-bold tracking-tight text-gt-ink">곁에</h1>
        <p className="mt-2 font-display italic text-lg tracking-[0.15em] text-gt-terra">GYEOTAE</p>
      </div>
    </div>
  );
}
