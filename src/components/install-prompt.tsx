"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

/**
 * InstallPrompt — gently invites users to add 곁에 to their home screen so it
 * behaves like a native app. Android fires `beforeinstallprompt`; iOS needs
 * the manual "share → add to home screen" hint.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;
    // Respect a previous dismissal so we don't nag on every page load.
    try { if (localStorage.getItem("gt-install-dismissed")) return; } catch {}

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS gets a delayed manual hint
    let t: any;
    if (ios) t = setTimeout(() => setShow(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem("gt-install-dismissed", "1"); } catch {}
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    }
    dismiss();
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md animate-rise">
      <div className="gt-card flex items-start gap-3 p-4 shadow-2xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gt-coral to-gt-gold">
          <span className="text-lg text-white">♥</span>
        </div>
        <div className="flex-1">
          <p className="font-serif text-[15px] font-bold text-gt-ink">곁에를 홈 화면에 추가하세요</p>
          {isIOS ? (
            <p className="mt-1 text-xs leading-relaxed text-gt-muted">
              하단의 <Share className="inline h-3.5 w-3.5" /> 공유 버튼을 누르고{" "}
              <Plus className="inline h-3.5 w-3.5" /> ‘홈 화면에 추가’를 선택하세요.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-gt-muted">
              앱처럼 빠르게 열고, 알림도 받을 수 있어요.
            </p>
          )}
          {!isIOS && (
            <button
              onClick={install}
              className="mt-3 rounded-xl bg-gt-coral px-4 py-2 text-xs font-semibold text-white"
            >
              홈 화면에 추가
            </button>
          )}
        </div>
        <button onClick={dismiss} className="shrink-0 text-gt-mutedLight" aria-label="닫기">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
