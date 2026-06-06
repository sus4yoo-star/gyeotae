"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Droplet, TriangleAlert, Pill, Stethoscope, ShieldAlert, PhoneCall, Loader2, HeartPulse } from "lucide-react";
import { fetchEmergencyCard, EmergencyContact } from "@/lib/medical";

type Card = {
  parent_name?: string; parent_age?: number; sex?: string; blood_type?: string;
  allergies?: string; conditions?: string; medications?: string; dnr?: boolean;
  doctor?: string; hospital?: string; emergency_contacts?: EmergencyContact[];
};

export default function EmergencyPage() {
  const params = useParams();
  const token = String((params as { token?: string }).token || "");
  const [data, setData] = useState<Card | null | undefined>(undefined);

  useEffect(() => {
    fetchEmergencyCard(token).then((d) => setData((d as Card) ?? null)).catch(() => setData(null));
  }, [token]);

  if (data === undefined) {
    return <main className="flex min-h-dvh items-center justify-center bg-white"><Loader2 className="h-7 w-7 animate-spin text-[#DC3A3A]" /></main>;
  }
  if (data === null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-white px-8 text-center">
        <p className="font-serif text-lg text-gt-ink">응급 정보를 찾을 수 없어요</p>
        <p className="text-sm text-gt-muted">링크가 만료되었거나 비활성화되었습니다.</p>
      </main>
    );
  }

  const contacts = Array.isArray(data.emergency_contacts) ? data.emergency_contacts : [];

  return (
    <main className="min-h-dvh bg-white pb-10">
      {/* emergency header */}
      <header className="px-5 py-5 text-white" style={{ background: "linear-gradient(135deg,#DC3A3A,#9A1F1F)" }}>
        <p className="flex items-center gap-1.5 font-display text-[11px] tracking-[0.2em]"><HeartPulse className="h-4 w-4" /> EMERGENCY MEDICAL · 응급 의료 정보</p>
        <h1 className="mt-2 font-serif text-3xl font-bold">{data.parent_name || "—"}</h1>
        <p className="text-sm opacity-90">{data.parent_age ? `${data.parent_age}세` : ""}{data.sex ? ` · ${data.sex}` : ""}</p>
      </header>

      {/* blood + DNR strip */}
      <div className="flex items-stretch gap-px bg-gt-line">
        <div className="flex flex-1 items-center justify-center gap-2 bg-white py-4">
          <Droplet className="h-5 w-5" style={{ color: "#CC3A3A" }} fill="#CC3A3A" />
          <span className="font-serif text-2xl font-bold text-[#CC3A3A]">{data.blood_type || "—"}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-white py-4">
          <span className="font-display text-[10px] tracking-wide text-gt-muted">DNR</span>
          <span className={`font-serif text-base font-bold ${data.dnr ? "text-[#CC3A3A]" : "text-gt-mutedLight"}`}>{data.dnr ? "있음" : "없음"}</span>
        </div>
      </div>

      <div className="space-y-3 px-5 pt-4">
        <Row Icon={TriangleAlert} label="알레르기" value={data.allergies} alarm />
        <Row Icon={Pill} label="복용 중인 약" value={data.medications} />
        <Row Icon={Stethoscope} label="지병" value={data.conditions} />
        {(data.doctor || data.hospital) && (
          <Row Icon={Stethoscope} label="주치의 · 병원" value={[data.doctor, data.hospital].filter(Boolean).join(" · ")} />
        )}

        {/* contacts — big tap-to-call */}
        {contacts.length > 0 && (
          <div className="rounded-2xl border border-gt-line p-1">
            <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 font-display text-[11px] font-semibold tracking-wide text-gt-muted"><PhoneCall className="h-3.5 w-3.5 text-[#DC3A3A]" /> 보호자 연락처</p>
            {contacts.map((c, i) => (
              <a key={i} href={`tel:${(c.phone || "").replace(/[^0-9+]/g, "")}`}
                className="flex items-center justify-between rounded-xl px-3 py-3 active:bg-gt-cream">
                <span className="font-serif text-[15px] text-gt-ink"><strong>{c.relation || "가족"}</strong> {c.name}</span>
                <span className="rounded-full bg-[#DC3A3A] px-4 py-2 text-sm font-bold text-white">전화 ↗</span>
              </a>
            ))}
          </div>
        )}

        {/* one-tap 119 */}
        <a href="tel:119" className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#DC3A3A] py-4 text-lg font-bold text-white">
          🚨 119 전화하기
        </a>
        <p className="pt-1 text-center font-display text-[10px] tracking-[0.16em] text-gt-mutedLight">곁에 · GYEOTAE — 가족이 등록한 응급 정보</p>
      </div>
    </main>
  );
}

function Row({ Icon, label, value, alarm }: { Icon: React.ElementType; label: string; value?: string; alarm?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${alarm ? "border-[#DC3A3A]/40 bg-[#FBEAEA]" : "border-gt-line bg-white"}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-4 w-4" style={{ color: alarm ? "#DC3A3A" : "#9B5333" }} />
        <span className="font-display text-[11px] font-semibold tracking-wide text-gt-muted">{label}</span>
      </div>
      <p className={`whitespace-pre-line font-serif text-[15px] leading-snug ${alarm ? "font-bold text-[#CC3A3A]" : "text-gt-ink"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
