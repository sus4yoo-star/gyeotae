"use client";

import { useEffect, useState } from "react";

/**
 * Parent-device mode — a lightweight, client-only lock (no new auth).
 * When a family member flips this on for the parent's phone/tablet, the app
 * pins itself to the calm 부모님 화면(/home): the 자녀 dashboard and member
 * controls are hidden from the bottom nav and guarded on the route. It's a
 * UX/safety convenience, not a security boundary — stored in localStorage.
 */
const KEY = "gt-device-mode";

export function useParentMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const read = () => { try { setOn(localStorage.getItem(KEY) === "parent"); } catch {} };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const set = (v: boolean) => {
    try { if (v) localStorage.setItem(KEY, "parent"); else localStorage.removeItem(KEY); } catch {}
    setOn(v);
  };

  return [on, set];
}
