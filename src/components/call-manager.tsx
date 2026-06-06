"use client";

import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCircleState, useCircleMembers } from "@/lib/circle";
import { useCall } from "@/lib/call";

/** Globally-mounted incoming/active video-call overlay (1:1 WebRTC). */
export function CallManager() {
  const { circle } = useCircleState();
  const { members, meId } = useCircleMembers(circle?.id);
  const myName = members.find((m) => m.user_id === meId)?.display_name || "가족";
  const { phase, peerName, localStream, remoteStream, startCall, accept, decline, hangup } = useCall(circle?.id, myName);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { if (localRef.current) localRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteRef.current) remoteRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => {
    const h = () => startCall();
    window.addEventListener("gyeotae-call-start", h);
    return () => window.removeEventListener("gyeotae-call-start", h);
  }, [startCall]);

  if (phase === "idle") return null;

  if (phase === "incoming") {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 text-white">
        <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gt-coral/30"><Video className="h-10 w-10" /></div>
        <p className="mt-5 font-serif text-2xl">{peerName} 님의 영상통화</p>
        <p className="text-sm text-white/70">받으시겠어요?</p>
        <div className="mt-12 flex gap-12">
          <button onClick={decline} className="flex flex-col items-center gap-2 text-sm">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gt-danger"><PhoneOff className="h-7 w-7" /></span>거절
          </button>
          <button onClick={accept} className="flex flex-col items-center gap-2 text-sm">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gt-sage"><Phone className="h-7 w-7" /></span>받기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
      {phase === "calling" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-gt-coral/30"><Video className="h-9 w-9" /></div>
          <p className="mt-4 font-serif text-xl">연결 중…</p>
          <p className="text-sm text-white/60">가족이 받으면 연결돼요</p>
        </div>
      )}
      <video ref={localRef} autoPlay playsInline muted className="absolute right-4 top-4 h-40 w-28 rounded-xl border border-white/20 object-cover" />
      <div className="absolute inset-x-0 bottom-10 flex justify-center">
        <button onClick={hangup} className="flex h-16 w-16 items-center justify-center rounded-full bg-gt-danger text-white shadow-lg"><PhoneOff className="h-7 w-7" /></button>
      </div>
    </div>
  );
}
