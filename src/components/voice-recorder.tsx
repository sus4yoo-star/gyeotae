"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { uploadVoiceMessage } from "@/lib/voice";

const MAX_SEC = 60;

/** Senior-friendly one-button voice recorder. Records up to 60s, uploads, pushes. */
export function VoiceRecorder({ circleId, onToast }: { circleId: string | null; onToast?: (m: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "uploading">("idle");
  const [secs, setSecs] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
  };

  const start = async () => {
    if (!circleId) { onToast?.("로그인 후 가족에게 음성을 보낼 수 있어요"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const dur = (Date.now() - startedRef.current) / 1000;
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setState("uploading");
        const ok = await uploadVoiceMessage(circleId, blob, dur);
        setState("idle"); setSecs(0);
        onToast?.(ok ? "음성 메시지를 보냈어요 💛" : "전송에 실패했어요");
      };
      mr.start();
      mrRef.current = mr;
      startedRef.current = Date.now();
      setState("recording");
      timerRef.current = setInterval(() => setSecs((s) => { const n = s + 1; if (n >= MAX_SEC) stop(); return n; }), 1000);
    } catch {
      onToast?.("마이크 권한이 필요해요");
    }
  };

  if (state === "uploading") {
    return (
      <button disabled className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gt-paper2 py-4 font-semibold text-gt-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> 보내는 중…
      </button>
    );
  }
  if (state === "recording") {
    const mm = String(Math.floor(secs / 60)).padStart(1, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return (
      <button onClick={stop} className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gt-danger py-4 text-lg font-bold text-white">
        <span className="flex h-6 w-6 animate-pulse items-center justify-center"><Square className="h-4 w-4" fill="white" /></span>
        멈추고 보내기 · {mm}:{ss}
      </button>
    );
  }
  return (
    <button onClick={start} className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gt-coral py-4 text-lg font-bold text-white active:scale-[0.98] transition-transform">
      <Mic className="h-5 w-5" /> 가족에게 음성 보내기
    </button>
  );
}
