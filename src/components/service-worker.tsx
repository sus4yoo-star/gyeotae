"use client";
import { useEffect } from "react";
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const reg = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      } catch {}
    };
    reg();
  }, []);
  return null;
}
