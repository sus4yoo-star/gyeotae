"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, HeartHandshake, Phone, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "부모님", icon: Home },
  { href: "/family", label: "자녀", icon: HeartHandshake },
  { href: "/call", label: "안부", icon: Phone },
];

/** A11y: cycle font size for seniors. Persists on <html data-fontsize>. */
function FontSizeButton() {
  const [size, setSize] = useState<"normal" | "large" | "xlarge">("normal");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("gt-fontsize")) as any;
    if (saved) { setSize(saved); document.documentElement.dataset.fontsize = saved === "normal" ? "" : saved; }
  }, []);
  const cycle = () => {
    const next = size === "normal" ? "large" : size === "large" ? "xlarge" : "normal";
    setSize(next);
    document.documentElement.dataset.fontsize = next === "normal" ? "" : next;
    try { localStorage.setItem("gt-fontsize", next); } catch {}
  };
  return (
    <button onClick={cycle} className="flex flex-1 flex-col items-center gap-1 py-2 text-gt-mutedLight" aria-label="글자 크기">
      <Type className="h-5 w-5" />
      <span className="text-[10px] font-medium">글자 크기</span>
    </button>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="sticky bottom-0 z-40 mx-auto w-full max-w-md border-t border-gt-line bg-gt-cream/90 backdrop-blur-md">
      <div className="flex items-stretch px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        {tabs.map((t) => {
          const active = path === t.href;
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
                active ? "text-gt-coral" : "text-gt-mutedLight")}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
        <FontSizeButton />
      </div>
    </nav>
  );
}
