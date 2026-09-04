import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useLocation } from "wouter";

import RichTextEditor from "@/components/RichTextEditor";
import { checkAuth, createNews, deleteNews, fetchAdminNews, generateNewsWithAi, translateNewsDraftWithAi, updateNews, uploadAdminPublicImage, type News, type NewsInput } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";

const translationLanguages = [
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "ro", label: "Română" },
  { code: "ar", label: "العربية" },
] as const;

const empty: NewsInput = {
  slug: "",
  title: "",
  excerpt: "",
  content: "<p></p>",
  coverImage: null,
  gallery: [],
  metaTitle: null,
  metaDescription: null,
  translations: {},
  primaryKeyword: null,
  brief: null,
  scheduledAt: null,
  published: false,
};

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);

export default function AdminNews() {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<News[]>([]);
  const [form, setForm] = useState<NewsInput>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ai, setAi] = useState({ topic: "", keyword: "", brief: "", wordCount: 1200 });
  const [translationLang, setTranslationLang] = useState<(typeof translationLanguages)[number]["code"]>("fr");

  const load = async () => setItems(await fetchAdminNews());
  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) setLocation("/admin");
      else {
        setAuthorized(true);
        void load();
      }
    });
  }, [setLocation]);

  const set = <K extends keyof NewsInput>(key: K, value: NewsInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setEditing(null); setForm(empty); setMessage(""); };
  const edit = (item: News) => {
    setEditing(item.id);
    setForm({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      coverImage: item.coverImage,
      gallery: item.gallery || [],
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      translations: item.translations || {},
      primaryKeyword: item.primaryKeyword,
      brief: item.brief,
      scheduledAt: item.scheduledAt,
      published: item.published,
    });
    setAi((current) => ({ ...current, topic: item.title, keyword: item.primaryKeyword || "", brief: item.brief || "" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const prepared = { ...form, slug: form.slug || slugify(form.title), primaryKeyword: form.primaryKeyword || ai.keyword || null, brief: form.brief || ai.brief || null };
      editing ? await updateNews(editing, prepared) : await createNews(prepared);
      await load();
      reset();
      setMessage("News saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true); setMessage("");
    try {
      const draft = await generateNewsWithAi(ai);
      setForm((current) => ({
        ...current,
        ...draft,
        slug: draft.slug || slugify(draft.title),
        primaryKeyword: ai.keyword || ai.topic,
        brief: ai.brief,
        published: false,
      }));
      setEditing(null);
      setMessage("AI news draft and translations are ready. Review it, add photos, then publish.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI news generation failed");
    } finally {
      setBusy(false);
    }
  };

  const setTranslation = (field: string, value: string) => {
    setForm((current) => ({
      ...current,
      translations: {
        ...(current.translations || {}),
        [translationLang]: {
          ...((current.translations || {})[translationLang] || {}),
          [field]: value,
        },
      },
    }));
  };

  const activeTranslation = (form.translations || {})[translationLang] || {};

  const translateDraft = async () => {
    const plainContent = form.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (form.title.trim().length < 3 || plainContent.length < 20) {
      setMessage("Write or generate the English news article before translating.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const translations = await translateNewsDraftWithAi({
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      });
      setForm((current) => ({ ...current, translations: { ...(current.translations || {}), ...translations } }));
      setMessage("AI translations are ready. Review and edit them, then save.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI news translation failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadOne = async (file?: File, mode: "cover" | "gallery" = "gallery") => {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const compressed = await compressImage(file, 1920, 0.85);
      const url = await uploadAdminPublicImage(compressed, "news");
      if (mode === "cover") set("coverImage", url);
      else set("gallery", [...(form.gallery || []), url].slice(0, 10));
      setMessage("Image uploaded");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadGallery = async (files?: FileList | null) => {
    if (!files?.length) return;
    const available = 10 - (form.gallery?.length || 0);
    for (const file of Array.from(files).slice(0, available)) {
      await uploadOne(file, "gallery");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this news article permanently?")) return;
    setBusy(true);
    try {
      await deleteNews(id);
      await load();
      if (editing === id) reset();
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => setLocation("/admin/dashboard")} className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold"><ArrowLeft size={16} /> Back to admin</button>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Admin</p>
            <h1 className="mt-2 font-serif text-4xl">News</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Create multilingual news articles with AI, a title image and a gallery of up to ten photos.</p>
          </div>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-gold"><Plus size={16} /> New article</button>
        </div>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-7">
          <h2 className="font-serif text-2xl">AI brief</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs text-white/55">Topic<input value={ai.topic} onChange={(e) => setAi((current) => ({ ...current, topic: e.target.value }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" placeholder="Luxury car rental in Monaco for the yacht show" /></label>
            <label className="text-xs text-white/55">Primary keyword<input value={ai.keyword} onChange={(e) => setAi((current) => ({ ...current, keyword: e.target.value }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" placeholder="luxury car rental Monaco" /></label>
            <label className="text-xs text-white/55">Target words<input type="number" min={1000} max={1500} value={ai.wordCount} onChange={(e) => setAi((current) => ({ ...current, wordCount: Number(e.target.value) || 1200 }))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Article description / notes<textarea value={ai.brief} onChange={(e) => setAi((current) => ({ ...current, brief: e.target.value }))} rows={4} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" placeholder="What should the news explain, promote or announce?" /></label>
          </div>
          <button disabled={busy || ai.topic.trim().length < 5} onClick={generate} className="mt-5 inline-flex items-center gap-2 rounded bg-gold px-5 py-3 text-sm font-medium text-black disabled:opacity-40"><Sparkles size={16} /> {busy ? "Working…" : "Generate news with AI"}</button>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-7">
          <h2 className="font-serif text-2xl">{editing ? "Edit news" : "Article draft"}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs text-white/55">Slug<input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <label className="text-xs text-white/55">Title<input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Excerpt<textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <label className="text-xs text-white/55">SEO title<input value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <label className="text-xs text-white/55">SEO description<input value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
            <div className="md:col-span-2"><p className="mb-2 text-xs text-white/55">Article</p><RichTextEditor content={form.content} onChange={(html) => set("content", html)} /></div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold/70">Translations</p>
                <p className="mt-1 text-xs text-white/35">Generate all languages with AI, then edit each version manually before saving.</p>
              </div>
              <button type="button" disabled={busy || form.title.trim().length < 3} onClick={translateDraft} className="inline-flex items-center gap-2 rounded border border-gold/30 px-4 py-2 text-xs text-gold hover:bg-gold/10 disabled:opacity-40"><Sparkles size={14} /> {busy ? "Working…" : "Translate article with AI"}</button>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {translationLanguages.map((language) => (
                <button
                  type="button"
                  key={language.code}
                  onClick={() => setTranslationLang(language.code)}
                  className={`rounded px-3 py-2 text-xs transition ${translationLang === language.code ? "bg-gold text-black" : "border border-white/10 text-white/55 hover:text-gold"}`}
                >
                  {language.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/55">Translated title<input value={activeTranslation.title || ""} onChange={(e) => setTranslation("title", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
              <label className="text-xs text-white/55">Translated SEO title<input value={activeTranslation.metaTitle || ""} onChange={(e) => setTranslation("metaTitle", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
              <label className="text-xs text-white/55 md:col-span-2">Translated excerpt<textarea value={activeTranslation.excerpt || ""} onChange={(e) => setTranslation("excerpt", e.target.value)} rows={2} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
              <label className="text-xs text-white/55 md:col-span-2">Translated SEO description<input value={activeTranslation.metaDescription || ""} onChange={(e) => setTranslation("metaDescription", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white" /></label>
              <div className="md:col-span-2">
                <p className="mb-2 text-xs text-white/55">Translated article</p>
                <RichTextEditor content={activeTranslation.content || "<p></p>"} onChange={(html) => setTranslation("content", html)} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-white/55">Title image</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-4 py-2 text-sm text-white/65 hover:text-gold"><Upload size={15} /> Upload cover<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadOne(e.target.files?.[0], "cover")} className="hidden" /></label>
              {form.coverImage && <img src={form.coverImage} alt="" className="mt-3 h-32 rounded object-cover" />}
            </div>
            <div>
              <p className="mb-2 text-xs text-white/55">Gallery ({form.gallery?.length || 0}/10)</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-4 py-2 text-sm text-white/65 hover:text-gold"><Upload size={15} /> Upload gallery<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadGallery(e.target.files)} className="hidden" /></label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(form.gallery || []).map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={url} alt="" className="aspect-square rounded object-cover" /><button onClick={() => set("gallery", (form.gallery || []).filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded bg-black/70 p-1 text-red-300"><Trash2 size={12} /></button></div>)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} /> Published and visible</label>
            <button disabled={busy || !form.title || !form.slug || !form.excerpt || !form.content} onClick={save} className="rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Working…" : editing ? "Save changes" : "Create news"}</button>
          </div>
          {message && <p className="mt-4 rounded border border-white/10 bg-black/25 px-3 py-2 text-xs text-gold/80">{message}</p>}
        </section>

        <section className="mt-8 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3"><h2 className="truncate font-serif text-xl">{item.title}</h2><span className={`rounded-full px-2 py-1 text-[9px] uppercase ${item.published ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>{item.published ? "Published" : "Draft"}</span></div>
                <p className="mt-1 truncate text-xs text-white/35">/news/{item.slug}/ · {item.primaryKeyword || "no keyword"}</p>
              </div>
              <div className="flex gap-2"><button onClick={() => edit(item)} className="rounded border border-white/10 p-2 text-white/60 hover:text-gold"><Pencil size={17} /></button><button onClick={() => remove(item.id)} className="rounded border border-white/10 p-2 text-red-400/60 hover:text-red-400"><Trash2 size={17} /></button></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
