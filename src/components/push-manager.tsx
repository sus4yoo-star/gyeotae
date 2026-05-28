"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";

/** Converts a base64url VAPID key to the Uint8Array the Push API needs. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * PushManager — a small button that asks for notification permission and
 * registers a web-push subscription tied to the current care circle. This is
 * what makes the SOS button able to reach the WHOLE family's phones.
 */
export function PushManager({ circleId }: { circleId?: string }) {
  const [state, setState] = useState<"idle" | "on" | "unsupported">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setState("on");
    });
  }, []);

  async function enable() {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) { alert("푸시 키가 설정되지 않았어요. README의 VAPID 설정을 확인해주세요."); return; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    await fetch("/api/push/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub, circle_id: circleId }),
    });
    setState("on");
  }

  if (state === "unsupported") return null;

  return (
    <button
      onClick={enable}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        state === "on"
          ? "border-gt-sage/40 bg-gt-sageSoft text-gt-sage"
          : "border-gt-coral/40 bg-gt-coralSoft text-gt-coralDeep"
      }`}
    >
      {state === "on" ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {state === "on" ? "알림 켜짐" : "알림 켜기"}
    </button>
  );
}
