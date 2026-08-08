import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import RichTextEditor from "@/components/RichTextEditor";
import { checkAuth, createGuide, deleteGuide, fetchAdminGuides, updateGuide, uploadAdminPublicImage, type Guide, type GuideInput } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";

const empty: GuideInput = { slug: "", title: "", excerpt: "", content: "<p></p>", coverImage: null, metaTitle: null, metaDescription: null, translations: {}, published: false };
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);

export default function AdminGuides() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Guide[]>([]);
  const [form, setForm] = useState<GuideInput>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = () => fetchAdminGuides().then(setItems);
  useEffect(() => { checkAuth().then((ok) => ok ? load() : setLocation("/admin")); }, [setLocation]);
  const set = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const edit = (guide: Guide) => { setEditing(guide.id); setForm({ slug: guide.slug, title: guide.title, excerpt: guide.excerpt, content: guide.content, coverImage: guide.coverImage, metaTitle: guide.metaTitle, metaDescription: guide.metaDescription, translations: guide.translations || {}, published: guide.published }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setEditing(null); setForm(empty); };
  const save = async () => { setBusy(true); setMessage(""); try { editing ? await updateGuide(editing, form) : await createGuide(form); await load(); reset(); setMessage("Guide saved"); } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed"); } finally { setBusy(false); } };
  const remove = async (id: number) => { if (!window.confirm("Delete this guide permanently?")) return; await deleteGuide(id); await load(); if (editing === id) reset(); };
  const upload = async (file?: File) => { if (!file) return; setBusy(true); try { const compressed = await compressImage(file, 1920, 0.85); set("coverImage", await uploadAdminPublicImage(compressed, "guides")); } catch (err) { setMessage(err instanceof Error ? err.message : "Upload failed"); } finally { setBusy(false); } };

  return <div className="min-h-screen bg-[hsl(0,0%,3%)] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <button onClick={() => setLocation("/admin/dashboard")} className="mb-7 flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={17}/> Admin dashboard</button>
    <div className="mb-8 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">SEO Content</p><h1 className="mt-2 font-serif text-4xl">Guides & Articles</h1></div>{editing !== null && <button onClick={reset} className="flex items-center gap-2 rounded border border-white/15 px-4 py-2 text-sm"><Plus size={16}/> New guide</button>}</div>
    {message && <div className="mb-6 rounded border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-gold">{message}</div>}
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-7"><div className="grid gap-5 md:grid-cols-2">
      <label className="text-xs text-white/50">Title<input value={form.title} onChange={(e) => { set("title", e.target.value); if (!editing) set("slug", slugify(e.target.value)); }} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">URL slug<input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="md:col-span-2 text-xs text-white/50">Short excerpt<textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">SEO title<input value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">SEO description<input value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <div className="md:col-span-2"><p className="mb-2 text-xs text-white/50">Article content</p><RichTextEditor content={form.content} onChange={(html) => set("content", html)}/></div>
      <div><p className="mb-2 text-xs text-white/50">Cover image</p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} className="text-sm text-white/50"/>{form.coverImage && <img src={form.coverImage} alt="" className="mt-3 h-32 rounded object-cover"/>}</div>
      <label className="flex items-center gap-3 self-end text-sm"><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4"/> Published and visible on site</label>
    </div><button disabled={busy || !form.title || !form.slug || !form.excerpt || !form.content} onClick={save} className="mt-7 rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Saving…" : editing ? "Save changes" : "Create guide"}</button></section>
    <section className="mt-10 space-y-3">{items.map((guide) => <div key={guide.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-3"><h2 className="truncate font-serif text-xl">{guide.title}</h2><span className={`rounded-full px-2 py-1 text-[9px] uppercase ${guide.published ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>{guide.published ? "Published" : "Draft"}</span></div><p className="mt-1 truncate text-xs text-white/35">/guides/{guide.slug}/</p></div><div className="flex gap-2"><button onClick={() => edit(guide)} className="rounded border border-white/10 p-2 text-white/60 hover:text-gold"><Pencil size={17}/></button><button onClick={() => remove(guide.id)} className="rounded border border-white/10 p-2 text-red-400/60 hover:text-red-400"><Trash2 size={17}/></button></div></div>)}</section>
  </div></div>;
}
