import { useEffect, useState } from "react";
import { Copy, ExternalLink, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { createReviewWorkflow, deleteReviewWorkflow, fetchCompletedBookingsForReviews, fetchReviewWorkflows, generateReviewReply, updateReviewWorkflow, type CompletedBookingForReview, type ReviewWorkflow } from "@/lib/api";

const GOOGLE_REVIEW_STORAGE = "tyg_google_review_url";

export function ReviewsDashboard() {
  const [rows, setRows] = useState<ReviewWorkflow[]>([]);
  const [bookings, setBookings] = useState<CompletedBookingForReview[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [reviewUrl, setReviewUrl] = useState(() => localStorage.getItem(GOOGLE_REVIEW_STORAGE) || "");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => { const [r, b] = await Promise.all([fetchReviewWorkflows(), fetchCompletedBookingsForReviews()]); setRows(r); setBookings(b); };
  useEffect(() => { void load().catch((e) => setMessage(e.message)); }, []);
  const create = async () => {
    if (!bookingId || !reviewUrl) return setMessage("Select a completed booking and add the Google review link.");
    setBusy(true); try { localStorage.setItem(GOOGLE_REVIEW_STORAGE, reviewUrl); await createReviewWorkflow({ bookingId: Number(bookingId), reviewUrl, language, channel: "whatsapp" }); await load(); setMessage("Review request prepared."); } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  const patch = async (id: number, data: Record<string, unknown>) => { setBusy(true); try { await updateReviewWorkflow(id, data); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); } };
  return <div className="space-y-6">
    <div><h2 className="font-serif text-2xl text-white">Customer Reviews</h2><p className="text-sm text-white/45 mt-1">Request genuine Google reviews, track them and publish selected testimonials.</p></div>
    {message && <div className="border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{message}</div>}
    <section className="border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-[.18em] text-white/60">Prepare a review request</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="bg-black border border-white/15 px-3 py-3 text-sm"><option value="">Completed booking…</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.clientName || "Unnamed"} — {b.vehicleName || "Vehicle"} — {b.endDate}</option>)}</select>
        <input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="Google review HTTPS link" className="bg-black border border-white/15 px-3 py-3 text-sm" />
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-black border border-white/15 px-3 py-3 text-sm"><option value="en">English</option><option value="fr">Français</option><option value="ru">Русский</option><option value="ro">Română</option><option value="ar">العربية</option></select>
      </div>
      <button disabled={busy} onClick={create} className="bg-gold text-black px-5 py-3 text-xs uppercase tracking-widest disabled:opacity-50">Create request</button>
    </section>
    <div className="space-y-4">{rows.map((r) => {
      const wa = `https://wa.me/${(r.clientPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(r.requestMessage || "")}`;
      return <article key={r.id} className="border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><div><div className="text-white">{r.clientName} <span className="text-white/35">· {r.vehicleName || "—"}</span></div><div className="text-[11px] uppercase tracking-wider text-gold/70 mt-1">{r.status} · {r.language}</div></div><button onClick={async () => { if (confirm("Delete this review record?")) { await deleteReviewWorkflow(r.id); await load(); } }}><Trash2 className="w-4 h-4 text-red-400/70" /></button></div>
        <textarea value={r.requestMessage || ""} readOnly className="w-full min-h-24 bg-black/50 border border-white/10 p-3 text-sm text-white/70" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { void navigator.clipboard.writeText(r.requestMessage || ""); void patch(r.id, { status: "sent" }); }} className="btn"><Copy className="w-4 h-4"/> Copy & mark sent</button>
          {r.clientPhone && <a href={wa} target="_blank" rel="noreferrer" onClick={() => void patch(r.id, { status: "sent" })} className="btn"><MessageCircle className="w-4 h-4"/> WhatsApp</a>}
          {r.reviewUrl && <a href={r.reviewUrl} target="_blank" rel="noreferrer" className="btn"><ExternalLink className="w-4 h-4"/> Review form</a>}
        </div>
        <div className="grid md:grid-cols-[100px_1fr] gap-3"><input type="number" min="1" max="5" defaultValue={r.rating || ""} onBlur={(e) => void patch(r.id, { rating: Number(e.target.value), status: "received" })} placeholder="Stars" className="field"/><textarea defaultValue={r.reviewText || ""} onBlur={(e) => void patch(r.id, { reviewText: e.target.value, status: "received" })} placeholder="Paste the genuine Google review here" className="field min-h-24" /></div>
        <div className="flex flex-wrap gap-2"><button disabled={!r.reviewText || busy} onClick={async () => { setBusy(true); try { await generateReviewReply(r.id); await load(); } catch(e) { setMessage(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); } }} className="btn"><Sparkles className="w-4 h-4"/> Draft AI reply</button><label className="btn cursor-pointer"><input type="checkbox" checked={r.showOnSite} onChange={(e) => void patch(r.id, { showOnSite: e.target.checked })}/> Show on site</label></div>
        {r.replyDraft !== null && <div><label className="text-xs text-white/40">Public reply draft — review it, copy it to Google, then mark replied</label><textarea defaultValue={r.replyDraft || ""} onBlur={(e) => void patch(r.id, { replyDraft: e.target.value })} className="field min-h-24 mt-2"/><button onClick={() => void patch(r.id, { status: "replied" })} className="btn mt-2">Mark reply published</button></div>}
      </article>;
    })}</div>
    <style>{`.btn{display:inline-flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.14);padding:.65rem .85rem;font-size:.75rem;color:rgba(255,255,255,.75)}.btn:hover{border-color:rgba(196,163,98,.6);color:white}.field{background:#000;border:1px solid rgba(255,255,255,.14);padding:.7rem;color:white;width:100%}`}</style>
  </div>;
}
