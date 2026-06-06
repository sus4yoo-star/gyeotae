"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Users, Lock, EyeOff, X, Trash2, Loader2, Play } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useCircleState, useCircleMembers } from "@/lib/circle";
import { useParentMode } from "@/lib/device";
import { useMedia, uploadMedia, takedownMedia, setMediaVisibility, Visibility, VIS_LABEL, MediaItem } from "@/lib/album";

const VIS_ICON: Record<Visibility, React.ReactNode> = {
  family: <Users className="h-3 w-3" />, caregivers: <Lock className="h-3 w-3" />, private: <EyeOff className="h-3 w-3" />,
};

export default function AlbumPage() {
  const { circle, status } = useCircleState();
  const [parentMode] = useParentMode();
  const { members, meId } = useCircleMembers(circle?.id);
  const { items } = useMedia(circle?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [vis, setVis] = useState<Visibility>("family");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<(MediaItem & { url?: string }) | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Parent device only sees whole-family items.
  const visible = useMemo(() => parentMode ? items.filter((i) => i.visibility === "family") : items, [items, parentMode]);
  const nameOf = (uid: string | null) => members.find((m) => m.user_id === uid)?.display_name || "가족";

  const onPick = (f: File | null) => { if (!f) return; setPending(f); setVis(parentMode ? "family" : "family"); setCaption(""); };

  const doUpload = async () => {
    if (!pending || !circle?.id) return;
    setBusy(true);
    const ok = await uploadMedia(circle.id, pending, vis, caption);
    setBusy(false);
    if (ok) { setPending(null); showToast("앨범에 올렸어요"); }
    else showToast("업로드에 실패했어요");
  };

  if (status === "loading") return (<><main className="gt-aurora flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gt-coral" /></main><BottomNav /></>);
  if (status === "demo") return (
    <><main className="gt-aurora flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-bold text-gt-ink">가족 앨범</h1>
      <p className="mt-2 text-[15px] text-gt-muted">로그인하면 사진·영상을 가족과 나눌 수 있어요.</p>
      <Link href="/login" className="mt-5 rounded-2xl bg-gt-coral px-6 py-3 font-semibold text-white">로그인</Link>
    </main><BottomNav /></>
  );

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden bg-gt-cream">
        <header className="flex shrink-0 items-center justify-between border-b border-gt-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/family" className="flex h-8 w-8 items-center justify-center rounded-full bg-gt-paper2"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="font-serif text-lg text-gt-ink">가족 앨범</h1>
          </div>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-full bg-gt-coral px-3.5 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> 올리기
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </header>

        <div className="flex-1 overflow-y-auto gt-scroll p-3">
          {visible.length === 0 ? (
            <p className="mt-16 text-center text-sm leading-relaxed text-gt-muted">아직 올린 사진·영상이 없어요.<br />오른쪽 위 ‘올리기’로 첫 추억을 남겨보세요 📷</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {visible.map((m) => (
                <button key={m.id} onClick={() => setView(m)} className="relative aspect-square overflow-hidden rounded-lg bg-gt-paper2">
                  {m.kind === "video"
                    ? <><video src={m.url} className="h-full w-full object-cover" muted playsInline /><span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="h-6 w-6 text-white" fill="white" /></span></>
                    : <img src={m.url} alt={m.caption ?? ""} className="h-full w-full object-cover" />}
                  <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-white">{VIS_ICON[m.visibility]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />

      {/* upload sheet */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !busy && setPending(null)}>
          <div className="w-full max-w-md rounded-t-[1.75rem] bg-gt-cream p-5 sm:rounded-[1.5rem]" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-lg text-gt-ink">앨범에 올리기</p>
            <div className="mt-3 overflow-hidden rounded-xl bg-black/5">
              {pending.type.startsWith("video")
                ? <video src={URL.createObjectURL(pending)} className="max-h-56 w-full object-contain" controls />
                : <img src={URL.createObjectURL(pending)} alt="" className="max-h-56 w-full object-contain" />}
            </div>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="설명 (선택)"
              className="mt-3 w-full rounded-xl border border-gt-line bg-white px-3.5 py-2.5 font-serif text-[15px] outline-none focus:border-gt-coral" />
            <p className="mb-1.5 mt-3 text-[12px] font-semibold text-gt-muted">누구에게 보일까요?</p>
            <div className="flex gap-1.5">
              {(parentMode ? ["family"] : ["family", "caregivers", "private"] as Visibility[]).map((v) => (
                <button key={v} onClick={() => setVis(v as Visibility)} className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[13px] font-semibold ${vis === v ? "bg-gt-coral text-white" : "bg-gt-paper2 text-gt-ink"}`}>
                  {VIS_ICON[v as Visibility]} {VIS_LABEL[v as Visibility]}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setPending(null)} disabled={busy} className="flex-1 rounded-2xl bg-gt-paper2 py-3 font-semibold text-gt-ink">취소</button>
              <button onClick={doUpload} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gt-coral py-3 font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 올리기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* full view */}
      {view && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setView(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs">{VIS_ICON[view.visibility]} {VIS_LABEL[view.visibility]}</span>
            <button onClick={() => setView(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            {view.kind === "video"
              ? <video src={view.url} className="max-h-full max-w-full" controls autoPlay />
              : <img src={view.url} alt={view.caption ?? ""} className="max-h-full max-w-full object-contain" />}
          </div>
          <div className="p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm">{view.caption}</p>
            <p className="mt-0.5 text-xs text-white/60">{nameOf(view.uploader)} · {new Date(view.created_at).toLocaleDateString("ko-KR")}</p>
            {view.uploader === meId && (
              <div className="mt-3 flex gap-2">
                {(["family", "caregivers", "private"] as Visibility[]).map((v) => (
                  <button key={v} onClick={async () => { await setMediaVisibility(view.id, v); setView({ ...view, visibility: v }); showToast(`${VIS_LABEL[v]}(으)로 변경`); }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${view.visibility === v ? "bg-white text-gt-ink" : "bg-white/15 text-white"}`}>
                    {VIS_ICON[v]} {VIS_LABEL[v]}
                  </button>
                ))}
                <button onClick={async () => { if (confirm("이 항목을 내릴까요? 모두에게서 사라져요.")) { await takedownMedia(view.id); setView(null); showToast("앨범에서 내렸어요"); } }}
                  className="ml-auto flex items-center gap-1 rounded-full bg-gt-danger px-2.5 py-1 text-xs font-semibold text-white"><Trash2 className="h-3 w-3" /> 내리기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-2xl bg-gt-ink px-5 py-3 text-sm text-white shadow-2xl">{toast}</div>}
    </>
  );
}
