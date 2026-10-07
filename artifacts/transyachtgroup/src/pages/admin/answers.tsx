import { useEffect, useMemo, useState } from "react";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import { checkAuth, createAnswer, deleteAnswer, fetchAdminAnswers, generateAnswerWithAi, updateAnswer, type Answer, type AnswerInput } from "@/lib/api";

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
  return value.split(/\n\s*\n/).map((block) => {
    const [question, ...answer] = block.split("\n");
    return { question: (question || "").trim(), answer: answer.join("\n").trim() };
  }).filter((item) => item.question && item.answer);
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

  const canSave = useMemo(() => form.slug && form.question && form.directAnswer.length >= 40 && form.explanation.length >= 120, [form]);

  const load = async () => {
    const data = await fetchAdminAnswers();
    setItems(data);
  };

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) setLocation("/admin");
      else {
        setAuthorized(true);
        void load();
      }
    });
  }, [setLocation]);

  const set = <K extends keyof AnswerInput>(key: K, value: AnswerInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const generate = async () => {
    setBusy(true);
    setMessage("AI is creating a direct-answer page…");
    try {
      const draft = await generateAnswerWithAi(ai);
      setForm({ ...emptyForm, ...draft, language: "en", published: false });
      setFaqText(faqToText(draft.faq));
      setEditing(null);
      setMessage("AI answer draft is ready. Review and publish when ready.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI answer generation failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form, faq: textToFaq(faqText) };
      if (editing) await updateAnswer(editing.id, payload);
      else await createAnswer(payload);
      setMessage(editing ? "Answer updated." : "Answer created.");
      setEditing(null);
      setForm(emptyForm);
      setFaqText("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const edit = (item: Answer) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      question: item.question,
      directAnswer: item.directAnswer,
      explanation: item.explanation,
      faq: item.faq || [],
      metaTitle: item.metaTitle || "",
      metaDescription: item.metaDescription || "",
      primaryKeyword: item.primaryKeyword || "",
      audience: item.audience || "",
      relatedServicePath: item.relatedServicePath || "",
      language: item.language || "en",
      published: item.published,
    });
    setFaqText(faqToText(item.faq || []));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this answer permanently?")) return;
    setBusy(true);
    try {
      await deleteAnswer(id);
      await load();
      setMessage("Answer deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) return <div className="min-h-screen bg-background p-10 text-white">Checking access…</div>;

  return (
    <div className="min-h-screen bg-background p-5 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => setLocation("/admin/dashboard")} className="mb-6 text-sm text-white/45 hover:text-gold">← Admin dashboard</button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">GEO / AI search</p>
            <h1 className="mt-3 font-serif text-4xl">AI Answers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Create direct-answer pages for AI search: short answer, deeper explanation, FAQ schema and sitemap.</p>
          </div>
          {message && <p className="max-w-md rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/55">{message}</p>}
        </div>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-serif text-2xl">Generate answer with AI</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs text-white/55">Topic / question<textarea value={ai.topic} onChange={(e) => setAi((v) => ({ ...v, topic: e.target.value }))} rows={3} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" placeholder="Example: Is Courchevel better with a private chauffeur or self-drive luxury car?" /></label>
            <label className="text-xs text-white/55">Primary keyword<input value={ai.keyword} onChange={(e) => setAi((v) => ({ ...v, keyword: e.target.value }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" placeholder="courchevel luxury car rental" /></label>
            <label className="text-xs text-white/55">Audience<input value={ai.audience} onChange={(e) => setAi((v) => ({ ...v, audience: e.target.value }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" placeholder="VIP clients, concierge services, hotel guests" /></label>
            <label className="text-xs text-white/55">Related service path<input value={ai.relatedServicePath} onChange={(e) => setAi((v) => ({ ...v, relatedServicePath: e.target.value }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" placeholder="/services/courchevel-private-transfers/" /></label>
          </div>
          <button disabled={busy || ai.topic.trim().length < 5} onClick={generate} className="mt-5 inline-flex items-center gap-2 rounded bg-gold px-5 py-3 text-sm font-medium text-black disabled:opacity-40"><Sparkles size={16} /> {busy ? "Working…" : "Generate answer"}</button>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-serif text-2xl">{editing ? "Edit answer" : "Answer draft"}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs text-white/55">Slug<input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Primary keyword<input value={form.primaryKeyword || ""} onChange={(e) => set("primaryKeyword", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Question<input value={form.question} onChange={(e) => set("question", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Direct answer<textarea value={form.directAnswer} onChange={(e) => set("directAnswer", e.target.value)} rows={5} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Explanation HTML<textarea value={form.explanation} onChange={(e) => set("explanation", e.target.value)} rows={12} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 font-mono text-xs text-white" /></label>
            <label className="text-xs text-white/55">Meta title<input value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Related service path<input value={form.relatedServicePath || ""} onChange={(e) => set("relatedServicePath", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Meta description<textarea value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value)} rows={2} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">FAQ blocks — question line, answer line, blank line between blocks<textarea value={faqText} onChange={(e) => setFaqText(e.target.value)} rows={8} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Published</label>
          </div>
          <div className="mt-5 flex gap-3">
            <button disabled={busy || !canSave} onClick={save} className="rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Working…" : editing ? "Save changes" : "Create answer"}</button>
            {editing && <button onClick={() => { setEditing(null); setForm(emptyForm); setFaqText(""); }} className="rounded border border-white/10 px-6 py-3 text-sm text-white/60">Cancel</button>}
          </div>
        </section>

        <section className="mt-10 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3"><h2 className="truncate font-serif text-xl">{item.question}</h2><span className={`rounded-full px-2 py-1 text-[9px] uppercase ${item.published ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>{item.published ? "Published" : "Draft"}</span></div>
                <p className="mt-1 truncate text-xs text-white/35">/answers/{item.slug}/ · {item.primaryKeyword || "no keyword"}</p>
              </div>
              <div className="flex gap-2"><button onClick={() => edit(item)} className="rounded border border-white/10 p-2 text-white/60 hover:text-gold"><Pencil size={17} /></button><button onClick={() => remove(item.id)} className="rounded border border-white/10 p-2 text-red-400/60 hover:text-red-400"><Trash2 size={17} /></button></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
