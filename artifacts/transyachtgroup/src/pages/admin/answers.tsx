import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import {
  auditAnswerSeo,
  checkAuth,
  createAnswer,
  deleteAnswer,
  fetchAdminAnswers,
  fixAnswerSeoWithAi,
  generateAnswerWithAi,
  updateAnswer,
  type Answer,
  type AnswerInput,
  type SeoAuditResult,
} from "@/lib/api";

const emptyForm: AnswerInput = {
  slug: "",
  question: "",
  directAnswer: "",
  explanation: "",
  faq: [],
  metaTitle: "",
  metaDescription: "",
  primaryKeyword: "",
  audience: "",
  relatedServicePath: "",
  language: "en",
  published: false,
};

function faqToText(faq: AnswerInput["faq"]) {
  return (faq || []).map((item) => `${item.question}\n${item.answer}`).join("\n\n");
}

function textToFaq(value: string): AnswerInput["faq"] {
  return value
    .split(/\n\s*\n/)
    .map((block) => {
      const [question, ...answer] = block.split("\n");
      return { question: (question || "").trim(), answer: answer.join("\n").trim() };
    })
    .filter((item) => item.question && item.answer);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}

function fieldClass(extra = "") {
  return `mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none ${extra}`;
}

export default function AdminAnswers() {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<Answer[]>([]);
  const [editing, setEditing] = useState<Answer | null>(null);
  const [form, setForm] = useState<AnswerInput>(emptyForm);
  const [faqText, setFaqText] = useState("");
  const [ai, setAi] = useState({ topic: "", keyword: "", audience: "", relatedServicePath: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [seoAudit, setSeoAudit] = useState<SeoAuditResult | null>(null);
  const [query, setQuery] = useState("");

  const payload = useMemo(() => ({ ...form, faq: textToFaq(faqText) }), [form, faqText]);
  const canSave = useMemo(() => form.slug && form.question && form.directAnswer.length >= 40 && form.explanation.length >= 120, [form]);
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.question, item.slug, item.primaryKeyword, item.audience, item.relatedServicePath].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [items, query]);

  const load = async () => setItems(await fetchAdminAnswers());

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) setLocation("/admin");
      else { setAuthorized(true); void load(); }
    });
  }, [setLocation]);

  const set = <K extends keyof AnswerInput>(key: K, value: AnswerInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const resetDraft = () => { setEditing(null); setForm(emptyForm); setFaqText(""); setSeoAudit(null); setMessage(""); };

  const generate = async () => {
    setBusy(true); setMessage("AI is creating a GEO-ready direct-answer page…");
    try {
      const draft = await generateAnswerWithAi(ai);
      setForm({ ...emptyForm, ...draft, language: "en", published: false });
      setFaqText(faqToText(draft.faq));
      setEditing(null); setSeoAudit(null);
      setMessage("AI answer draft is ready. Review it, audit SEO, then publish when ready.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "AI answer generation failed"); }
    finally { setBusy(false); }
  };

  const runAudit = async () => {
    setBusy(true);
    try { const result = await auditAnswerSeo(payload); setSeoAudit(result); setMessage(`SEO/GEO audit completed: ${result.score}/100`); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Answer SEO audit failed"); }
    finally { setBusy(false); }
  };

  const fixSeo = async () => {
    setBusy(true); const before = seoAudit?.score;
    try {
      const result = await fixAnswerSeoWithAi(payload);
      setForm({ ...emptyForm, ...result.draft, published: false });
      setFaqText(faqToText(result.draft.faq));
      setSeoAudit(result.audit);
      setMessage(`AI corrected the answer. SEO/GEO score: ${before ?? "?"}/100 → ${result.audit.score}/100. Review before saving; publication is off.`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "AI answer SEO correction failed"); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = editing ? await updateAnswer(editing.id, payload) : await createAnswer(payload);
      setMessage(editing ? "Answer updated." : "Answer created.");
      setEditing(saved);
      setForm({ slug: saved.slug, question: saved.question, directAnswer: saved.directAnswer, explanation: saved.explanation, faq: saved.faq || [], metaTitle: saved.metaTitle || "", metaDescription: saved.metaDescription || "", primaryKeyword: saved.primaryKeyword || "", audience: saved.audience || "", relatedServicePath: saved.relatedServicePath || "", language: saved.language || "en", published: saved.published });
      setFaqText(faqToText(saved.faq || []));
      await load();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const edit = (item: Answer) => {
    setEditing(item);
    setForm({ slug: item.slug, question: item.question, directAnswer: item.directAnswer, explanation: item.explanation, faq: item.faq || [], metaTitle: item.metaTitle || "", metaDescription: item.metaDescription || "", primaryKeyword: item.primaryKeyword || "", audience: item.audience || "", relatedServicePath: item.relatedServicePath || "", language: item.language || "en", published: item.published });
    setFaqText(faqToText(item.faq || [])); setSeoAudit(null); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this answer permanently?")) return;
    setBusy(true);
    try { await deleteAnswer(id); await load(); if (editing?.id === id) resetDraft(); setMessage("Answer deleted."); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Delete failed"); }
    finally { setBusy(false); }
  };

  if (!authorized) return <div className="min-h-screen bg-background p-10 text-white">Checking access…</div>;

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <button onClick={() => setLocation("/admin/dashboard")} className="mb-6 text-sm text-white/45 hover:text-gold">← Admin dashboard</button>

        <section className="overflow-hidden rounded-2xl border border-gold/20 bg-[radial-gradient(circle_at_top_left,rgba(214,177,90,0.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gold/75">GEO / AI search content</p>
              <h1 className="mt-4 font-serif text-4xl md:text-5xl">AI Answers</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Build direct-answer pages for Google, AI search and rich FAQ coverage. Same workflow as Guides and News: generate, edit, audit, fix with AI and publish only after review.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-2xl font-semibold text-gold">{items.length}</p><p className="text-[10px] uppercase tracking-wide text-white/35">Answers</p></div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-2xl font-semibold text-emerald-400">{items.filter((i) => i.published).length}</p><p className="text-[10px] uppercase tracking-wide text-white/35">Published</p></div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-2xl font-semibold text-white">{items.filter((i) => !i.published).length}</p><p className="text-[10px] uppercase tracking-wide text-white/35">Drafts</p></div>
            </div>
          </div>
          {message && <p className="mt-5 rounded border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">{message}</p>}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <main className="space-y-8">
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-5 flex items-start gap-3"><Sparkles className="mt-1 text-gold" size={20} /><div><h2 className="font-serif text-2xl">Create with OpenAI</h2><p className="mt-1 text-sm text-white/45">Generates a focused direct answer, deeper explanation, FAQ and metadata. Nothing is published automatically.</p></div></div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs text-white/55 md:col-span-2">Topic / question<textarea value={ai.topic} onChange={(e) => setAi((v) => ({ ...v, topic: e.target.value }))} rows={3} className={fieldClass()} placeholder="Example: Is Courchevel better with a private chauffeur or self-drive luxury car?" /></label>
                <label className="text-xs text-white/55">Primary keyword<input value={ai.keyword} onChange={(e) => setAi((v) => ({ ...v, keyword: e.target.value }))} className={fieldClass()} placeholder="courchevel luxury car rental" /></label>
                <label className="text-xs text-white/55">Related service path<input value={ai.relatedServicePath} onChange={(e) => setAi((v) => ({ ...v, relatedServicePath: e.target.value }))} className={fieldClass()} placeholder="/services/courchevel-private-transfers/" /></label>
                <label className="text-xs text-white/55 md:col-span-2">Audience<input value={ai.audience} onChange={(e) => setAi((v) => ({ ...v, audience: e.target.value }))} className={fieldClass()} placeholder="VIP clients, concierge services, hotel guests" /></label>
              </div>
              <button disabled={busy || ai.topic.trim().length < 5} onClick={generate} className="mt-5 inline-flex items-center gap-2 rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40"><Sparkles size={16} /> {busy ? "Generating…" : "Generate AI answer draft"}</button>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">{editing ? "Edit answer" : "Answer draft"}</h2><p className="mt-1 text-sm text-white/40">Write in English first. Audit and fix before publishing.</p></div><button onClick={resetDraft} className="rounded border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-white/55 hover:border-gold/30 hover:text-gold">New blank answer</button></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-white/55">Slug<input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={fieldClass()} /></label>
                <label className="text-xs text-white/55">Primary keyword<input value={form.primaryKeyword || ""} onChange={(e) => set("primaryKeyword", e.target.value)} className={fieldClass()} /></label>
                <label className="text-xs text-white/55 md:col-span-2">Question / title<input value={form.question} onChange={(e) => set("question", e.target.value)} className={fieldClass()} /></label>
                <label className="text-xs text-white/55 md:col-span-2">Direct answer<textarea value={form.directAnswer} onChange={(e) => set("directAnswer", e.target.value)} rows={5} className={fieldClass()} /></label>
                <label className="text-xs text-white/55 md:col-span-2">Explanation HTML<textarea value={form.explanation} onChange={(e) => set("explanation", e.target.value)} rows={14} className={fieldClass("font-mono text-xs leading-6")} /></label>
                <label className="text-xs text-white/55">Meta title<input value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value)} className={fieldClass()} /></label>
                <label className="text-xs text-white/55">Related service path<input value={form.relatedServicePath || ""} onChange={(e) => set("relatedServicePath", e.target.value)} className={fieldClass()} /></label>
                <label className="text-xs text-white/55">Audience<input value={form.audience || ""} onChange={(e) => set("audience", e.target.value)} className={fieldClass()} /></label>
                <label className="text-xs text-white/55">Language<select value={form.language} onChange={(e) => set("language", e.target.value)} className={fieldClass()}><option value="en">English</option><option value="fr">French</option><option value="ru">Russian</option><option value="ro">Romanian</option><option value="ar">Arabic</option></select></label>
                <label className="text-xs text-white/55 md:col-span-2">Meta description<textarea value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value)} rows={2} className={fieldClass()} /></label>
                <label className="text-xs text-white/55 md:col-span-2">FAQ blocks — question line, answer line, blank line between blocks<textarea value={faqText} onChange={(e) => setFaqText(e.target.value)} rows={8} className={fieldClass()} /></label>
                <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="accent-[hsl(43,67%,55%)]" /> Published</label>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button disabled={busy || !canSave} onClick={save} className="rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Working…" : editing ? "Save changes" : "Create answer"}</button>
                <button disabled={busy || !canSave} onClick={runAudit} className="inline-flex items-center gap-2 rounded border border-white/15 px-5 py-3 text-sm disabled:opacity-40"><ShieldCheck size={16} /> Audit SEO/GEO</button>
                {seoAudit && seoAudit.issues.length > 0 && <button disabled={busy} onClick={fixSeo} className="inline-flex items-center gap-2 rounded border border-gold/35 bg-gold/5 px-5 py-3 text-sm text-gold disabled:opacity-40"><Sparkles size={16} /> Fix with AI</button>}
                <button disabled={busy || !form.question} onClick={() => setAi({ topic: form.question, keyword: form.primaryKeyword || "", audience: form.audience || "", relatedServicePath: form.relatedServicePath || "" })} className="inline-flex items-center gap-2 rounded border border-white/15 px-5 py-3 text-sm text-white/65 disabled:opacity-40"><RefreshCw size={16} /> Use as AI prompt</button>
              </div>
              {seoAudit && <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-white/35">SEO/GEO readiness</p><p className={`mt-1 text-4xl font-semibold ${seoAudit.score >= 80 ? "text-emerald-400" : seoAudit.score >= 60 ? "text-gold" : "text-red-400"}`}>{seoAudit.score}/100</p></div><div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/45 md:grid-cols-3"><span>Direct: {seoAudit.stats.directWords || 0} words</span><span>Explanation: {seoAudit.stats.explanationWords || 0} words</span><span>FAQ: {seoAudit.stats.faqCount || 0}</span><span>H2: {seoAudit.stats.h2Count || 0}</span><span>Links: {seoAudit.stats.linkCount || 0}</span><span>Meta: {seoAudit.stats.metaDescriptionLength || 0} chars</span></div></div>{seoAudit.issues.length ? <ul className="mt-4 space-y-2">{seoAudit.issues.map((issue) => <li key={issue.code} className="rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65"><span className="mr-2 text-gold">{issue.code}</span>{issue.message}</li>)}</ul> : <p className="mt-4 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={16} /> No critical issues found.</p>}</div>}
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-2xl">Library</h2><span className="text-xs text-white/35">{filteredItems.length} shown</span></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search answers…" className={fieldClass("mt-4")} /><div className="mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">{filteredItems.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 font-serif text-lg leading-snug">{item.question}</h3><p className="mt-1 truncate text-xs text-white/35">/answers/{item.slug}/</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] uppercase ${item.published ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>{item.published ? "Live" : "Draft"}</span></div><p className="mt-3 text-xs text-white/40">{item.primaryKeyword || "No keyword"} · {item.language?.toUpperCase() || "EN"}</p><div className="mt-4 flex gap-2"><button onClick={() => edit(item)} className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-gold"><Pencil size={14} /> Edit</button><button onClick={() => remove(item.id)} className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs text-red-400/70 hover:text-red-300"><Trash2 size={14} /> Delete</button></div></div>)}{!filteredItems.length && <p className="rounded border border-white/10 bg-black/25 p-4 text-sm text-white/40">No answers found.</p>}</div></section>
          </aside>
        </div>
      </div>
    </div>
  );
}
