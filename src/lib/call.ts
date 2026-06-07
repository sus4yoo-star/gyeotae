"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Free Google STUN. NOTE: no TURN → may fail on symmetric NATs. Add TURN later.
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export type CallPhase = "idle" | "calling" | "incoming" | "connected";

interface Signal {
  kind: "ring" | "answer" | "ice" | "bye";
  callId: string;
  sender: string;
  senderName?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

/** Minimal 1:1 WebRTC call over a Supabase realtime broadcast channel. */
export function useCall(circleId?: string | null, myName = "가족") {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [peerName, setPeerName] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chanRef = useRef<ReturnType<NonNullable<ReturnType<typeof createClient>>["channel"]> | null>(null);
  const callIdRef = useRef("");
  const meRef = useRef("");
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const answeredRef = useRef(false);
  const localRef = useRef<MediaStream | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { localRef.current = localStream; }, [localStream]);

  const send = useCallback((s: Omit<Signal, "sender" | "senderName">) => {
    chanRef.current?.send({ type: "broadcast", event: "signal", payload: { ...s, sender: meRef.current, senderName: myName } });
  }, [myName]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
    pendingIce.current = [];
  }, []);

  const endLocal = useCallback(() => {
    pcRef.current?.close(); pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStream(null); setRemoteStream(null); setPhase("idle");
    offerRef.current = null; callIdRef.current = "";
    pendingIce.current = []; answeredRef.current = false;
  }, []);

  const newPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => { if (e.candidate) send({ kind: "ice", callId: callIdRef.current, candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) endLocal();
    };
    pcRef.current = pc;
    return pc;
  }, [send, endLocal]);

  useEffect(() => {
    if (!circleId) return;
    const sb = createClient();
    if (!sb) return;
    meRef.current = crypto.randomUUID();
    const ch = sb.channel(`rtc:${circleId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const p = payload as Signal;
      if (p.sender === meRef.current) return;
      if (p.kind === "ring") {
        if (phaseRef.current !== "idle") return; // busy → ignore
        callIdRef.current = p.callId; offerRef.current = p.sdp ?? null;
        pendingIce.current = []; answeredRef.current = false;
        setPeerName(p.senderName || "가족"); setPhase("incoming");
      } else if (p.kind === "answer" && p.callId === callIdRef.current && pcRef.current) {
        if (answeredRef.current) return; // first answerer wins (no glare)
        answeredRef.current = true;
        if (p.sdp) await pcRef.current.setRemoteDescription(p.sdp).catch(() => {});
        await flushIce();
        setPhase("connected");
      } else if (p.kind === "ice" && p.callId === callIdRef.current && p.candidate) {
        // Buffer candidates that arrive before the peer connection / remote desc is ready.
        if (pcRef.current && pcRef.current.remoteDescription) await pcRef.current.addIceCandidate(p.candidate).catch(() => {});
        else pendingIce.current.push(p.candidate);
      } else if (p.kind === "bye" && p.callId === callIdRef.current) {
        endLocal();
      }
    });
    ch.subscribe();
    chanRef.current = ch;
    return () => { sb.removeChannel(ch); chanRef.current = null; };
  }, [circleId, endLocal, flushIce]);

  const startCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
    if (!stream) return;
    setLocalStream(stream);
    callIdRef.current = crypto.randomUUID();
    answeredRef.current = false; pendingIce.current = [];
    const pc = newPC();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setPhase("calling");
    send({ kind: "ring", callId: callIdRef.current, sdp: offer });
    if (circleId) {
      try {
        await fetch("/api/push/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circle_id: circleId, title: "📞 영상통화", body: `${myName} 님이 영상통화를 걸었어요`, url: "/chat" }),
        });
      } catch {}
    }
  }, [newPC, send, circleId, myName]);

  const accept = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
    if (!stream || !offerRef.current) return;
    setLocalStream(stream);
    const pc = newPC();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await pc.setRemoteDescription(offerRef.current).catch(() => {});
    await flushIce(); // apply caller's early candidates buffered before accept
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ kind: "answer", callId: callIdRef.current, sdp: answer });
    setPhase("connected");
  }, [newPC, send, flushIce]);

  const hangup = useCallback(() => { send({ kind: "bye", callId: callIdRef.current }); endLocal(); }, [send, endLocal]);

  return { phase, peerName, localStream, remoteStream, startCall, accept, decline: hangup, hangup };
}

/** Trigger an outgoing call from anywhere (CallManager listens). */
export function requestStartCall() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("gyeotae-call-start"));
}
