"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import {
  X, Droplet, Stethoscope, TriangleAlert, Pill, Scissors,
  FileClock, PhoneCall, Pencil, Check, Download, Share2,
  QrCode, ShieldAlert, Plus, Trash2, Loader2, Hospital,
} from "lucide-react";
import {
  MedicalProfile, EmergencyContact, EMPTY_MEDICAL, DEMO_MEDICAL,
  getMedicalProfile, saveMedicalProfile, getEmergencyLink, ensureEmergencyLink, disableEmergencyLink,
} from "@/lib/medical";

interface Props {
  open: boolean;
  onClose: () => void;
  circleId?: string | null;
  parentName?: string;
  parentAge?: number | null;
}

export function MedicalCard({ open, onClose, circleId, parentName, parentAge }: Props) {
  const live = !!circleId;
  const [info, setInfo] = useState<MedicalProfile>(live ? EMPTY_MEDICAL : DEMO_MEDICAL);
  const [draft, setDraft] = useState<MedicalProfile>(live ? EMPTY_MEDICAL : DEMO_MEDICAL);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!live) { setInfo(DEMO_MEDICAL); setDraft(DEMO_MEDICAL); return; }
    setLoading(true);
    getMedicalProfile(circleId!).then((p) => { const v = p ?? EMPTY_MEDICAL; setInfo(v); setDraft(v); }).finally(() => setLoading(false));
    getEmergencyLink(circleId!).then((l) => setToken(l?.enabled ? l.token : null));
  }, [open, circleId, live]);

  useEffect(() => {
    if (!token) { setQr(null); return; }
    const url = `${window.location.origin}/e/${token}`;
    QRCode.toDataURL(url, { margin: 1, width: 360 }).then(setQr).catch(() => {});
  }, [token]);

  if (!open) return null;

  const name = parentName || "이옥자";
  const age = parentAge ?? 72;
  const upd = (k: keyof MedicalProfile, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!live) { setInfo(draft); setEditing(false); return; }
    setBusy(true);
    try { await saveMedicalProfile(circleId!, draft); setInfo(draft); setEditing(false); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  const toggleLink = async () => {
    if (!live) { alert("로그인 후 가족 모임에서 응급 공개 카드를 만들 수 있어요."); return; }
    setLinkBusy(true);
    try {
      if (token) { await disableEmergencyLink(circleId!); setToken(null); setShowQR(false); }
      else { const t = await ensureEmergencyLink(circleId!); setToken(t); setShowQR(true); }
    } finally { setLinkBusy(false); }
  };

  const copyLink = async () => {
    if (!token) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/e/${token}`); alert("응급 공개 링크를 복사했어요"); } catch {}
  };

  const addContact = () => upd("emergency_contacts", [...draft.emergency_contacts, { name: "", relation: "", phone: "" }]);
  const setContact = (i: number, patch: Partial<EmergencyContact>) =>
    upd("emergency_contacts", draft.emergency_contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const removeContact = (i: number) => upd("emergency_contacts", draft.emergency_contacts.filter((_, j) => j !== i));

  async function makePng(): Promise<string | null> {
    if (!captureRef.current) return null;
    return toPng(captureRef.current, { pixelRatio: 2.5, backgroundColor: "#FAF6EE", cacheBust: true });
  }
  async function saveImage() {
    setBusy(true);
    try { const url = await makePng(); if (url) { const a = document.createElement("a"); a.download = `곁에-의료카드-${name}.png`; a.href = url; a.click(); } }
    catch {} finally { setBusy(false); }
  }
  async function shareImage() {
    setBusy(true);
    try {
      const url = await makePng(); if (!url) return;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `곁에-의료카드-${name}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "곁에 응급 의료 정보", text: `${name}님의 응급 의료 정보` });
      } else { const a = document.createElement("a"); a.download = file.name; a.href = url; a.click(); }
    } catch {} finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-gt-cream sm:rounded-[1.5rem]" onClick={(e) => e.stopPropagation()}>
        {/* top bar */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <p className="font-display italic text-[11px] tracking-[0.16em] text-gt-terra">EMERGENCY MEDICAL · 응급 의료 정보</p>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => { setDraft(info); setEditing(true); }} className="flex items-center gap-1 rounded-full bg-gt-paper2 px-2.5 py-1 text-xs font-semibold text-gt-ink">
                <Pencil className="h-3 w-3" /> 편집
              </button>
            )}
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-gt-paper2 text-gt-ink"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto gt-scroll px-4 pb-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></div>
          ) : (
            <div ref={captureRef} className="overflow-hidden rounded-2xl border border-gt-line bg-white">
              {/* identity + blood */}
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(135deg,#DC6B4A,#B8543A)" }}>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    {name} <span className="text-sm font-normal opacity-85">{age}세{(editing ? draft.sex : info.sex) ? ` · ${editing ? draft.sex : info.sex}` : ""}</span>
                  </h3>
                  <p className="font-display italic text-[10px] tracking-[0.14em] text-white/75">곁에 · GYEOTAE</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5">
                  <Droplet className="h-4 w-4" style={{ color: "#CC3A3A" }} fill="#CC3A3A" />
                  <span className="font-serif text-lg font-bold text-gt-danger">{(editing ? draft.blood_type : info.blood_type) || "—"}</span>
                </div>
              </div>

              {editing && (<>
                <div className="grid grid-cols-2 gap-px bg-gt-line">
                  <EditCell label="성별"><SegButtons options={["남", "여"]} value={draft.sex} onChange={(v) => upd("sex", v)} /></EditCell>
                  <EditCell label="키 / 몸무게">
                    <div className="flex gap-1">
                      <input value={draft.height_cm ?? ""} onChange={(e) => upd("height_cm", e.target.value ? Number(e.target.value) : null)} placeholder="cm" className={inputCls} />
                      <input value={draft.weight_kg ?? ""} onChange={(e) => upd("weight_kg", e.target.value ? Number(e.target.value) : null)} placeholder="kg" className={inputCls} />
                    </div>
                  </EditCell>
                </div>
                <div className="border-t border-gt-line bg-white p-3">
                  <p className="mb-1.5 font-display text-[11px] font-semibold tracking-wide text-gt-muted">혈액형</p>
                  <BloodSelector value={draft.blood_type} onChange={(v) => upd("blood_type", v)} />
                </div>
              </>)}

              {/* allergies — highlighted */}
              <Field Icon={TriangleAlert} label="알레르기" tint="#C4843A" highlight
                editing={editing} value={editing ? draft.allergies : info.allergies}
                onChange={(v) => upd("allergies", v)} />

              <div className="grid grid-cols-2 gap-px bg-gt-line">
                <Field Icon={Stethoscope} label="지병" tint="#9B5333" editing={editing} value={editing ? draft.conditions : info.conditions} onChange={(v) => upd("conditions", v)} />
                <Field Icon={ShieldAlert} label="사전연명의료(DNR)" tint="#962020" dnr
                  editing={editing} dnrValue={editing ? draft.dnr : info.dnr} onDnr={(b) => upd("dnr", b)} />
              </div>

              <Field Icon={Pill} label="복용 중인 약" tint="#DC6B4A" full editing={editing} value={editing ? draft.medications : info.medications} onChange={(v) => upd("medications", v)} />

              {/* emergency contacts */}
              <div className="bg-white p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" style={{ color: "#DC6B4A" }} /><span className="font-display text-[11px] font-semibold tracking-wide text-gt-muted">응급 연락처</span></div>
                  {editing && <button onClick={addContact} className="flex items-center gap-0.5 rounded-full bg-gt-coralSoft px-2 py-0.5 text-[11px] font-semibold text-gt-coral"><Plus className="h-3 w-3" /> 추가</button>}
                </div>
                {editing ? (
                  <div className="space-y-1.5">
                    {draft.emergency_contacts.map((c, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input value={c.relation} onChange={(e) => setContact(i, { relation: e.target.value })} placeholder="관계" className={`${inputCls} w-14`} />
                        <input value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} placeholder="이름" className={`${inputCls} w-16`} />
                        <input value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} placeholder="전화번호" className={`${inputCls} flex-1`} />
                        <button onClick={() => removeContact(i)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gt-dangerSoft text-gt-danger"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {draft.emergency_contacts.length === 0 && <p className="text-[12px] text-gt-mutedLight">＋ 추가로 보호자·주치의를 등록하세요</p>}
                  </div>
                ) : info.emergency_contacts.length ? (
                  <div className="space-y-1">
                    {info.emergency_contacts.map((c, i) => (
                      <a key={i} href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center justify-between rounded-lg bg-gt-cream px-2.5 py-1.5">
                        <span className="font-serif text-[13px] text-gt-ink"><strong>{c.relation || "가족"}</strong> {c.name}</span>
                        <span className="font-display text-[13px] font-semibold text-gt-coral">{c.phone} ↗</span>
                      </a>
                    ))}
                  </div>
                ) : <p className="font-serif text-[13px] text-gt-mutedLight">—</p>}
              </div>

              {/* doctor / hospital */}
              <div className="grid grid-cols-2 gap-px bg-gt-line">
                <Field Icon={Stethoscope} label="주치의" tint="#6B8B76" editing={editing} value={editing ? draft.doctor : info.doctor} onChange={(v) => upd("doctor", v)} />
                <Field Icon={Hospital} label="병원" tint="#6B8B76" editing={editing} value={editing ? draft.hospital : info.hospital} onChange={(v) => upd("hospital", v)} />
              </div>

              {editing && (<>
                <Field Icon={Scissors} label="수술 이력" tint="#6B8B76" full editing value={draft.surgeries} onChange={(v) => upd("surgeries", v)} />
                <Field Icon={FileClock} label="병력" tint="#6E6657" full editing value={draft.history} onChange={(v) => upd("history", v)} />
                <div className="grid grid-cols-2 gap-px bg-gt-line">
                  <EditCell label="보험"><input value={draft.insurance} onChange={(e) => upd("insurance", e.target.value)} className={inputCls} /></EditCell>
                  <EditCell label="비고"><input value={draft.notes} onChange={(e) => upd("notes", e.target.value)} className={inputCls} /></EditCell>
                </div>
              </>)}
            </div>
          )}

          {/* 응급 공개 QR */}
          {!editing && (
            <div className="mt-3 rounded-2xl border border-gt-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-gt-coral" />
                  <span className="text-[13px] font-semibold text-gt-ink">응급 공개 카드</span>
                </div>
                <button onClick={toggleLink} disabled={linkBusy}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${token ? "bg-gt-sageSoft text-gt-sage" : "bg-gt-coral text-white"} disabled:opacity-50`}>
                  {linkBusy ? "…" : token ? "켜짐 ✓" : "켜기"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-gt-muted">
                켜면 로그인 없이 볼 수 있는 응급 링크/QR이 생겨요. 부모님 폰 배경·지갑에 두면 구급대원이 바로 확인합니다.
              </p>
              {token && (
                <div className="mt-3 flex flex-col items-center">
                  {showQR && qr && <img src={qr} alt="응급 QR" className="h-44 w-44 rounded-lg border border-gt-line" />}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setShowQR((s) => !s)} className="rounded-full bg-gt-paper2 px-3 py-1.5 text-xs font-semibold text-gt-ink">{showQR ? "QR 숨기기" : "QR 보기"}</button>
                    <button onClick={copyLink} className="rounded-full bg-gt-paper2 px-3 py-1.5 text-xs font-semibold text-gt-ink">링크 복사</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-gt-line bg-gt-cream p-4">
          {editing ? (
            <div className="flex gap-2.5">
              <button onClick={() => { setDraft(info); setEditing(false); }} className="flex-1 rounded-2xl bg-gt-paper2 py-3 font-semibold text-gt-ink">취소</button>
              <button onClick={save} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 저장하기
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button onClick={saveImage} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-paper2 py-3 font-semibold text-gt-ink disabled:opacity-50">
                <Download className="h-4 w-4" /> {busy ? "처리 중…" : "이미지"}
              </button>
              <button onClick={shareImage} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white disabled:opacity-50">
                <Share2 className="h-4 w-4" /> 공유하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gt-line bg-gt-cream px-2 py-1.5 font-serif text-[13px] outline-none focus:border-gt-coral";

function EditCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-3">
      <p className="mb-1 font-display text-[11px] font-semibold tracking-wide text-gt-muted">{label}</p>
      {children}
    </div>
  );
}

const segCls = (active: boolean) =>
  `flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${active ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`;

function SegButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(value === o ? "" : o)} className={segCls(value === o)}>{o}</button>
      ))}
    </div>
  );
}

const BLOOD_ABO = ["A형", "B형", "O형", "AB형"];
function BloodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const abo = BLOOD_ABO.find((b) => value.startsWith(b)) || "";
  const rh = value.includes("Rh-") ? "Rh-" : value.includes("Rh+") ? "Rh+" : "";
  const set = (a: string, r: string) => onChange(`${a}${a && r ? " " : ""}${r}`.trim());
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {BLOOD_ABO.map((b) => (
          <button key={b} type="button" onClick={() => set(abo === b ? "" : b, rh)} className={segCls(abo === b)}>{b}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {["Rh+", "Rh-"].map((r) => (
          <button key={r} type="button" onClick={() => set(abo, rh === r ? "" : r)} className={segCls(rh === r)}>{r}</button>
        ))}
      </div>
    </div>
  );
}

interface FieldProps {
  Icon: React.ElementType; label: string; tint: string; full?: boolean; highlight?: boolean; dnr?: boolean;
  editing: boolean; value?: string; onChange?: (v: string) => void;
  dnrValue?: boolean; onDnr?: (b: boolean) => void;
}
function Field({ Icon, label, tint, full, highlight, dnr, editing, value, onChange, dnrValue, onDnr }: FieldProps) {
  return (
    <div className={`p-3 ${full ? "col-span-2" : ""} ${highlight ? "bg-gt-dangerSoft" : "bg-white"}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: tint }} />
        <span className="font-display text-[11px] font-semibold tracking-wide text-gt-muted">{label}</span>
      </div>
      {dnr ? (
        editing ? (
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onDnr?.(true)} className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${dnrValue ? "bg-gt-danger text-white" : "bg-gt-paper2 text-gt-ink"}`}>예</button>
            <button type="button" onClick={() => onDnr?.(false)} className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${!dnrValue ? "bg-gt-ink text-white" : "bg-gt-paper2 text-gt-ink"}`}>아니오</button>
          </div>
        ) : (
          <p className={`font-serif text-[13px] ${dnrValue ? "font-bold text-gt-danger" : "text-gt-mutedLight"}`}>{dnrValue ? "예 — 사전연명의료의향 있음" : "아니오"}</p>
        )
      ) : editing ? (
        full
          ? <textarea value={value} onChange={(e) => onChange?.(e.target.value)} rows={2} className={`${inputCls} resize-none leading-relaxed`} />
          : <input value={value} onChange={(e) => onChange?.(e.target.value)} className={inputCls} />
      ) : (
        <p className={`whitespace-pre-line font-serif text-[13px] leading-snug ${highlight ? "font-semibold text-gt-danger" : "text-gt-inkSoft"}`}>
          {value || <span className="text-gt-mutedLight">—</span>}
        </p>
      )}
    </div>
  );
}
