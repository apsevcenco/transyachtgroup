import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, Link2, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import RichTextEditor from "@/components/RichTextEditor";
import { analyzeSeoIntelligence, auditGuideSeo, checkAuth, createGuide, createSeoCompetitor, deleteGuide, fetchAdminGuides, fetchGuideSeoContext, fetchGuideSeoOverview, fetchGuideSeoPlans, fetchSeoIntelligence, fixGuideSeoWithAi, generateGuideCoverWithAi, generateGuideSeoPlan, generateGuideWithAi, importGuideSearchMetrics, refreshGuideWithAi, scanSeoCompetitor, setSeoCompetitorActive, updateGuide, updateGuideSeoPlanItem, updateSeoOpportunity, uploadAdminPublicImage, type Guide, type GuideInput, type SeoAuditResult, type SeoContentPlan, type SeoIntelligence, type SeoOpportunity, type SeoPlanItem, type SeoPlanStatus, type SeoPlanStrategy } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";

const empty: GuideInput = { slug: "", title: "", excerpt: "", content: "<p></p>", coverImage: null, metaTitle: null, metaDescription: null, translations: {}, primaryKeyword: null, contentCluster: null, targetPage: null, scheduledAt: null, published: false };
const emptyPlanStrategy: SeoPlanStrategy = { direction: "", region: "", season: "", priorityServices: "", priorityFleet: "", keywords: "" };
const emptyIntelligence: SeoIntelligence = { competitors: [], snapshots: [], opportunities: [] };
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
const translationLanguages = [{ code: "fr", label: "Français" }, { code: "ru", label: "Русский" }, { code: "ro", label: "Română" }, { code: "ar", label: "العربية" }] as const;
const plainFleetText = (value: string | null | undefined) => {
  if (!value) return "";
  const parsed = new DOMParser().parseFromString(value, "text/html");
  return (parsed.body.textContent || "").replace(/\s+/g, " ").trim();
};
const fleetSpecLabels: Record<string, string> = {
  seats: "Seats", engine: "Engine", torque: "Torque", bodyType: "Body type", fuelType: "Fuel type",
  topSpeed: "Top speed", drivetrain: "Drivetrain", horsepower: "Horsepower", pricePerDay: "Price per day",
  acceleration: "Acceleration", transmission: "Transmission", length: "Length", guests: "Guests", cabins: "Cabins",
};
const formatFleetFacts = (vehicle: { name: string; category: string; description?: string | null; specs?: unknown }) => {
  const name = plainFleetText(vehicle.name);
  const description = plainFleetText(vehicle.description).replace(/[.]+$/, "");
  const specs = vehicle.specs && typeof vehicle.specs === "object" && !Array.isArray(vehicle.specs)
    ? vehicle.specs as Record<string, unknown>
    : {};
  const lines = Object.entries(specs)
    .filter(([key, value]) => key !== "fullDescription" && key !== "unitSystem" && value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${fleetSpecLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}: ${String(value)}`);
  const fullDescription = typeof specs.fullDescription === "string" ? specs.fullDescription.trim() : "";
  return [`${name} (${vehicle.category})`, description, ...lines, fullDescription ? `Full description: ${plainFleetText(fullDescription)}` : ""].filter(Boolean).join("\n");
};
const withEmptySeoMetrics = (guides: Guide[]): Array<Guide & { localMetrics: { views: number; leads: number; clicks: number }; opportunity: string | null }> =>
  guides.map((guide) => ({ ...guide, localMetrics: { views: 0, leads: 0, clicks: 0 }, opportunity: null }));

export default function AdminGuides() {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<Guide[]>([]);
  const [form, setForm] = useState<GuideInput>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ai, setAi] = useState({
    topic: "",
    keyword: "",
    service: "Luxury car rental",
    city: "French Riviera",
    audience: "International luxury travellers visiting the French Riviera",
    featuredAssets: "",
    internalLinks: "/cars/, /yachts/, /about/, /locations/cannes/, /locations/monaco/",
    tone: "Premium, discreet and expert",
    wordCount: 1200,
    notes: "",
  });
  const [translationLang, setTranslationLang] = useState<(typeof translationLanguages)[number]["code"]>("fr");
  const [seoAudit, setSeoAudit] = useState<SeoAuditResult | null>(null);
  const [context, setContext] = useState<Awaited<ReturnType<typeof fetchGuideSeoContext>> | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchGuideSeoOverview>>>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
  const [metricsJson, setMetricsJson] = useState("");
  const [seoPlan, setSeoPlan] = useState<SeoPlanItem[]>([]);
  const [savedPlans, setSavedPlans] = useState<SeoContentPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [planMessage, setPlanMessage] = useState("");
  const [planStrategy, setPlanStrategy] = useState<SeoPlanStrategy>(emptyPlanStrategy);
  const [intelligence, setIntelligence] = useState<SeoIntelligence>(emptyIntelligence);
  const [competitorForm, setCompetitorForm] = useState({ name: "", baseUrl: "", notes: "" });
  const [intelligenceBusy, setIntelligenceBusy] = useState(false);
  const [intelligenceMessage, setIntelligenceMessage] = useState("");
  const strategyFromPlan = (plan?: SeoContentPlan): SeoPlanStrategy => ({ ...emptyPlanStrategy, ...(plan?.strategy || {}) });
  const loadIntelligence = () => fetchSeoIntelligence().then(setIntelligence).catch(() => setIntelligence(emptyIntelligence));
  const load = async () => {
    const guides = await fetchAdminGuides();
    setItems(guides);
    try {
      const metrics = await fetchGuideSeoOverview();
      setOverview(metrics.length ? metrics : withEmptySeoMetrics(guides));
    } catch {
      setOverview(withEmptySeoMetrics(guides));
      setMessage("SEO performance metrics are temporarily unavailable, so articles are shown with zero local metrics.");
    }
    await Promise.all([
      fetchGuideSeoPlans().then((plans) => { setSavedPlans(plans); setActivePlanId((current) => { const selected = plans.find((plan) => plan.id === current) || plans[0]; setSeoPlan(selected?.items || []); setPlanStrategy(strategyFromPlan(selected)); return selected?.id || null; }); }).catch(() => { setSavedPlans([]); setSeoPlan([]); }),
      loadIntelligence(),
    ]);
  };
  useEffect(() => { checkAuth().then((ok) => { if (ok) { setAuthorized(true); void Promise.all([load(), fetchGuideSeoContext().then(setContext)]); } else setLocation("/admin"); }); }, [setLocation]);
  const set = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const edit = (guide: Guide) => { setEditing(guide.id); setForm({ slug: guide.slug, title: guide.title, excerpt: guide.excerpt, content: guide.content, coverImage: guide.coverImage, metaTitle: guide.metaTitle, metaDescription: guide.metaDescription, translations: guide.translations || {}, primaryKeyword: guide.primaryKeyword, contentCluster: guide.contentCluster, targetPage: guide.targetPage, scheduledAt: guide.scheduledAt, published: guide.published }); setSeoAudit(guide.seoAudit); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setEditing(null); setForm(empty); setSeoAudit(null); setSelectedVehicles([]); };
  const save = async () => { setBusy(true); setMessage(""); try { editing ? await updateGuide(editing, form) : await createGuide(form); await load(); reset(); setMessage("Guide saved"); } catch (err) { setMessage(err instanceof Error ? err.message : "Save failed"); } finally { setBusy(false); } };
  const remove = async (id: number) => { if (!window.confirm("Delete this guide permanently?")) return; await deleteGuide(id); await load(); if (editing === id) reset(); };
  const discardCurrentDraft = async () => {
    const prompt = editing ? "Delete this saved draft permanently? This cannot be undone." : "Discard this unsaved draft completely?";
    if (!window.confirm(prompt)) return;
    setBusy(true); setMessage("");
    try {
      if (editing) { await deleteGuide(editing); await load(); }
      reset();
      setMessage("Draft removed completely.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to remove draft"); }
    finally { setBusy(false); }
  };
  const upload = async (file?: File) => { if (!file) return; setBusy(true); try { const compressed = await compressImage(file, 1920, 0.85); set("coverImage", await uploadAdminPublicImage(compressed, "guides")); } catch (err) { setMessage(err instanceof Error ? err.message : "Upload failed"); } finally { setBusy(false); } };
  const generateCover = async () => {
    const title = form.title || ai.topic;
    if (title.trim().length < 3) { setMessage("Enter an article topic or title before generating a cover."); return; }
    setBusy(true); setMessage("");
    try {
      const url = await generateGuideCoverWithAi({ title, excerpt: form.excerpt, service: ai.service, city: ai.city });
      set("coverImage", url);
      setMessage("AI cover generated and saved. Review it before publishing.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "AI cover generation failed"); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    setBusy(true); setMessage("");
    try {
      const draft = await generateGuideWithAi(ai);
      const { coverImageWarning, translationWarning, ...generated } = draft;
      setForm((current) => ({ ...current, ...generated, slug: slugify(draft.title), primaryKeyword: ai.keyword || ai.topic, contentCluster: `${ai.service} — ${ai.city}`, targetPage: ai.service === "Yacht charter" ? "/yachts/" : "/cars/", published: false }));
      setEditing(null);
      setMessage(coverImageWarning || translationWarning || "AI article draft is ready. Review it, then generate a cover separately if needed.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "AI generation failed"); }
    finally { setBusy(false); }
  };
  const runAudit = async () => { setBusy(true); try { const result = await auditGuideSeo(form, editing || undefined); setSeoAudit(result); setMessage(`SEO audit completed: ${result.score}/100`); } catch (err) { setMessage(err instanceof Error ? err.message : "SEO audit failed"); } finally { setBusy(false); } };
  const fixSeo = async () => {
    if (!seoAudit?.issues.length) return;
    const previousScore = seoAudit.score;
    setBusy(true); setMessage("");
    try {
      const result = await fixGuideSeoWithAi({ ...form, published: false }, editing || undefined, ai.notes);
      setForm((current) => ({ ...current, ...result.draft, published: false }));
      setSeoAudit(result.audit);
      if (result.unresolvedAutoFixes?.length) {
        setMessage(`AI updated the draft, but some automatic SEO fixes still need attention: ${result.unresolvedAutoFixes.join(", ")}. SEO score: ${previousScore}/100 → ${result.audit.score}/100. Run Fix again or edit the highlighted fields manually; publication remains off.`);
      } else {
        setMessage(`AI applied the audit corrections. SEO score: ${previousScore}/100 → ${result.audit.score}/100. Review the text before saving; publication remains off.`);
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : "AI SEO correction failed"); }
    finally { setBusy(false); }
  };
  const refresh = async () => { if (!editing) return; setBusy(true); try { const draft = await refreshGuideWithAi(editing, ai); setForm((current) => ({ ...current, ...draft, published: false })); setMessage("Updated AI draft is ready for review; publication was switched off."); } catch (err) { setMessage(err instanceof Error ? err.message : "AI refresh failed"); } finally { setBusy(false); } };
  const toggleVehicle = (id: number) => {
    const ids = selectedVehicles.includes(id) ? selectedVehicles.filter((item) => item !== id) : [...selectedVehicles, id];
    setSelectedVehicles(ids);
    const facts = (context?.vehicles || []).filter((vehicle) => ids.includes(vehicle.id)).map(formatFleetFacts).join("\n\n");
    setAi((current) => ({ ...current, featuredAssets: (context?.vehicles || []).filter((vehicle) => ids.includes(vehicle.id)).map((vehicle) => plainFleetText(vehicle.name)).join(", "), notes: facts }));
  };
  const importMetrics = async () => { setBusy(true); try { const parsed = JSON.parse(metricsJson); const rows = Array.isArray(parsed) ? parsed : parsed.rows; const result = await importGuideSearchMetrics(rows); await load(); setMessage(`${result.updated} article metrics updated.`); } catch (err) { setMessage(err instanceof Error ? err.message : "Paste a valid JSON array"); } finally { setBusy(false); } };
  const makePlan = async () => {
    setBusy(true); setPlanMessage("Generating the plan…"); setSeoPlan([]);
    try {
      const result = await generateGuideSeoPlan(planStrategy);
      if (!Array.isArray(result.items) || !result.items.length) throw new Error("The server returned an empty plan. Please try again.");
      setSeoPlan(result.items);
      setSavedPlans((current) => [result, ...current.filter((plan) => plan.id !== result.id)]);
      setActivePlanId(result.id);
      setPlanStrategy(strategyFromPlan(result));
      setPlanMessage(`${result.items.length} article ideas generated and saved. Select one to fill the article form.`);
    } catch (err) {
      setPlanMessage(err instanceof Error ? err.message : "SEO plan generation failed");
    } finally { setBusy(false); }
  };
  const changePlanStatus = async (planId: number, itemIndex: number, status: SeoPlanStatus) => {
    setBusy(true); setPlanMessage("");
    try {
      const updated = await updateGuideSeoPlanItem(planId, itemIndex, status);
      setSavedPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
      if (activePlanId === updated.id) setSeoPlan(updated.items);
      setPlanMessage("Plan progress saved.");
    } catch (err) { setPlanMessage(err instanceof Error ? err.message : "Failed to update plan"); }
    finally { setBusy(false); }
  };
  const usePlanItem = (item: SeoPlanItem) => { setAi((current) => ({ ...current, topic: item.topic, keyword: item.keyword, service: item.service, city: item.city })); setForm((current) => ({ ...current, contentCluster: item.cluster, targetPage: item.targetPage })); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const addCompetitor = async () => {
    setIntelligenceBusy(true); setIntelligenceMessage("");
    try { await createSeoCompetitor(competitorForm); setCompetitorForm({ name: "", baseUrl: "", notes: "" }); await loadIntelligence(); setIntelligenceMessage("Competitor added. Run the first scan when ready."); }
    catch (err) { setIntelligenceMessage(err instanceof Error ? err.message : "Failed to add competitor"); }
    finally { setIntelligenceBusy(false); }
  };
  const scanCompetitorNow = async (id: number) => {
    setIntelligenceBusy(true); setIntelligenceMessage("Scanning the public homepage…");
    try { const result = await scanSeoCompetitor(id); await loadIntelligence(); setIntelligenceMessage(result.changed ? "Scan saved: public content changed." : "Scan saved: no public content change detected."); }
    catch (err) { setIntelligenceMessage(err instanceof Error ? err.message : "Competitor scan failed"); }
    finally { setIntelligenceBusy(false); }
  };
  const scanAllCompetitorsNow = async () => {
    const activeCompetitors = intelligence.competitors.filter((competitor) => competitor.active);
    if (!activeCompetitors.length) {
      setIntelligenceMessage("There are no active competitors to scan.");
      return;
    }
    setIntelligenceBusy(true);
    let scanned = 0;
    let changed = 0;
    let failed = 0;
    for (const [index, competitor] of activeCompetitors.entries()) {
      setIntelligenceMessage(`Scanning ${index + 1}/${activeCompetitors.length}: ${competitor.name}…`);
      try {
        const result = await scanSeoCompetitor(competitor.id);
        scanned += 1;
        if (result.changed) changed += 1;
      } catch {
        failed += 1;
      }
    }
    await loadIntelligence();
    setIntelligenceMessage(`Scan all complete: ${scanned} scanned, ${changed} changed, ${failed} failed.`);
    setIntelligenceBusy(false);
  };
  const analyzeCompetitors = async () => {
    setIntelligenceBusy(true); setIntelligenceMessage("AI is comparing signals with your fleet and existing guides…");
    try { const opportunities = await analyzeSeoIntelligence(); await loadIntelligence(); setIntelligenceMessage(`${opportunities.length} original SEO opportunities prepared. Nothing was published.`); }
    catch (err) { setIntelligenceMessage(err instanceof Error ? err.message : "SEO analysis failed"); }
    finally { setIntelligenceBusy(false); }
  };
  const useOpportunity = async (opportunity: SeoOpportunity) => {
    setPlanStrategy((current) => ({
      ...current,
      direction: [current.direction, `Competitor intelligence: ${opportunity.title}. ${opportunity.rationale}`].filter(Boolean).join("\n\n"),
      keywords: Array.from(new Set([...current.keywords.split(/[,\n]+/).map((value) => value.trim()).filter(Boolean), opportunity.keyword].filter(Boolean))).join(", "),
    }));
    await updateSeoOpportunity(opportunity.id, "planned");
    await loadIntelligence();
    setIntelligenceMessage("Opportunity added to the four-week plan brief. Review it and click Generate plan.");
    document.getElementById("four-week-plan")?.scrollIntoView({ behavior: "smooth" });
  };
  const clusters = useMemo(() => Object.entries(overview.reduce<Record<string, typeof overview>>((groups, guide) => { const key = guide.contentCluster || "Unassigned"; (groups[key] ||= []).push(guide); return groups; }, {})), [overview]);
  const scheduled = useMemo(() => items.filter((guide) => guide.scheduledAt && new Date(guide.scheduledAt) > new Date()).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))), [items]);
  const setTranslation = (field: string, value: string) => setForm((current) => ({
    ...current,
    translations: {
      ...(current.translations || {}),
      [translationLang]: { ...((current.translations || {})[translationLang] || {}), [field]: value },
    },
  }));
  const activeTranslation = (form.translations || {})[translationLang] || {};
  const activeSavedPlan = savedPlans.find((plan) => plan.id === activePlanId) || null;

  if (!authorized) return <div className="min-h-screen bg-[hsl(0,0%,3%)] p-8 text-sm text-white/40">Checking administrator session…</div>;

  return <div className="min-h-screen bg-[hsl(0,0%,3%)] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
    <button onClick={() => setLocation("/admin/dashboard")} className="mb-7 flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={17}/> Admin dashboard</button>
    <div className="mb-8 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">SEO Content</p><h1 className="mt-2 font-serif text-4xl">Guides & Articles</h1></div>{editing !== null && <button onClick={reset} className="flex items-center gap-2 rounded border border-white/15 px-4 py-2 text-sm"><Plus size={16}/> New guide</button>}</div>
    {message && <div className="mb-6 rounded border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-gold">{message}</div>}
    <section className="mb-7 rounded-xl border border-gold/20 bg-gold/[0.04] p-5 md:p-7">
      <div className="mb-5 flex items-start gap-3"><Sparkles className="mt-1 text-gold" size={20}/><div><h2 className="font-serif text-2xl">Create with OpenAI</h2><p className="mt-1 text-sm text-white/45">Generates an English article and localized FR, RU, RO and AR versions. Nothing is published automatically.</p></div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs text-white/50 md:col-span-2">Article topic<input value={ai.topic} onChange={(e) => setAi({ ...ai, topic: e.target.value })} placeholder="Example: How to choose a luxury car for a week in Cannes" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50 md:col-span-2">Primary search keyword<input value={ai.keyword} onChange={(e) => setAi({ ...ai, keyword: e.target.value })} placeholder="luxury car rental Cannes" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50">Service<select value={ai.service} onChange={(e) => setAi({ ...ai, service: e.target.value })} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"><option>Luxury car rental</option><option>Yacht charter</option><option>Airport transfer</option><option>Luxury travel</option></select></label>
        <label className="text-xs text-white/50">Location<input value={ai.city} onChange={(e) => setAi({ ...ai, city: e.target.value })} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50 md:col-span-2">Target audience<input value={ai.audience} onChange={(e) => setAi({ ...ai, audience: e.target.value })} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50">Tone<select value={ai.tone} onChange={(e) => setAi({ ...ai, tone: e.target.value })} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"><option>Premium, discreet and expert</option><option>Practical and authoritative</option><option>Elegant and inspirational</option><option>Concise and commercial</option></select></label>
        <label className="text-xs text-white/50">Target length<select value={ai.wordCount} onChange={(e) => setAi({ ...ai, wordCount: Number(e.target.value) })} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"><option value={1000}>About 1,000 words</option><option value={1200}>About 1,200 words</option><option value={1500}>About 1,500 words</option></select></label>
        <label className="text-xs text-white/50 md:col-span-2">Vehicles or yachts to feature<textarea value={ai.featuredAssets} onChange={(e) => setAi({ ...ai, featuredAssets: e.target.value })} rows={2} placeholder="Example: Mercedes-Benz S500 2026 — mention only when facts are confirmed below" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50 md:col-span-2">Approved internal links<textarea value={ai.internalLinks} onChange={(e) => setAi({ ...ai, internalLinks: e.target.value })} rows={2} placeholder="One or more site paths, separated by commas" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/50 md:col-span-2">Verified facts<textarea value={ai.notes} onChange={(e) => setAi({ ...ai, notes: e.target.value })} rows={4} placeholder="Only facts entered here may be used for prices, fleet details or special conditions." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        {context && <div className="md:col-span-2"><p className="mb-2 text-xs text-white/50">Use verified fleet data</p><div className="max-h-44 overflow-y-auto rounded border border-white/10 bg-black/30 p-3"><div className="grid gap-2 sm:grid-cols-2">{context.vehicles.map((vehicle) => <label key={vehicle.id} className="flex items-center gap-2 text-xs text-white/65"><input type="checkbox" checked={selectedVehicles.includes(vehicle.id)} onChange={() => toggleVehicle(vehicle.id)}/><span>{plainFleetText(vehicle.name)}</span><span className="text-white/25">{vehicle.category}</span></label>)}</div></div></div>}
        {context && <div className="md:col-span-2"><p className="mb-2 flex items-center gap-2 text-xs text-white/50"><Link2 size={13}/> Suggested internal links</p><div className="flex flex-wrap gap-2">{[...context.corePages, ...context.guides.slice(0, 8).map((guide) => `/guides/${guide.slug}/`)].map((link) => <button type="button" key={link} onClick={() => setAi((current) => ({ ...current, internalLinks: Array.from(new Set([...current.internalLinks.split(/[\s,]+/).filter(Boolean), link])).join(", ") }))} className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/45 hover:border-gold/30 hover:text-gold">+ {link}</button>)}</div></div>}
        <div className="md:col-span-2 rounded-lg border border-gold/15 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-white/75">Article cover image</p><p className="mt-1 text-xs text-white/35">A cover is generated automatically with a new AI draft. You can replace it with your own image or regenerate it.</p></div><div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded border border-white/15 px-4 py-2 text-xs text-white/65 hover:border-gold/30 hover:text-gold">Upload cover<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} className="hidden"/></label><button type="button" disabled={busy || !(form.title || ai.topic)} onClick={generateCover} className="inline-flex items-center gap-2 rounded border border-gold/30 px-4 py-2 text-xs text-gold disabled:opacity-40"><Sparkles size={14}/> Generate AI cover</button></div></div>{form.coverImage && <img src={form.coverImage} alt="Article cover preview" className="mt-4 aspect-[3/2] w-full max-w-xl rounded-lg object-cover"/>}</div>
      </div>
      <button disabled={busy || ai.topic.trim().length < 5} onClick={generate} className="mt-5 inline-flex items-center gap-2 rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40"><Sparkles size={16}/>{busy ? "Generating article…" : "Generate AI article draft"}</button>
    </section>
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-7"><div className="grid gap-5 md:grid-cols-2">
      <label className="text-xs text-white/50">Title<input value={form.title} onChange={(e) => { set("title", e.target.value); if (!editing) set("slug", slugify(e.target.value)); }} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">URL slug<input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="md:col-span-2 text-xs text-white/50">Short excerpt<textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">SEO title<input value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">SEO description<input value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">Primary keyword<input value={form.primaryKeyword || ""} onChange={(e) => set("primaryKeyword", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <label className="text-xs text-white/50">Content cluster<input value={form.contentCluster || ""} onChange={(e) => set("contentCluster", e.target.value || null)} list="guide-clusters" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/><datalist id="guide-clusters">{clusters.map(([name]) => <option key={name} value={name}/>)}</datalist></label>
      <label className="text-xs text-white/50">Commercial target page<input value={form.targetPage || ""} onChange={(e) => set("targetPage", e.target.value || null)} list="target-pages" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/><datalist id="target-pages">{context?.corePages.map((page) => <option key={page} value={page}/>)}</datalist></label>
      <label className="text-xs text-white/50">Schedule publication<input type="datetime-local" value={form.scheduledAt ? new Date(form.scheduledAt).toISOString().slice(0, 16) : ""} onChange={(e) => set("scheduledAt", e.target.value ? new Date(e.target.value).toISOString() : null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      <div className="md:col-span-2"><p className="mb-2 text-xs text-white/50">Article content</p><RichTextEditor content={form.content} onChange={(html) => set("content", html)}/></div>
      <div className="md:col-span-2 rounded-lg border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="mb-5 flex flex-wrap gap-2">{translationLanguages.map((language) => <button type="button" key={language.code} onClick={() => setTranslationLang(language.code)} className={`rounded px-3 py-2 text-xs ${translationLang === language.code ? "bg-gold text-black" : "border border-white/10 text-white/55"}`}>{language.label}</button>)}</div>
        <div className="grid gap-4 md:grid-cols-2" dir={translationLang === "ar" ? "rtl" : "ltr"}>
          <label className="text-xs text-white/50">Translated title<input value={activeTranslation.title || ""} onChange={(e) => setTranslation("title", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
          <label className="text-xs text-white/50">Translated SEO title<input value={activeTranslation.metaTitle || ""} onChange={(e) => setTranslation("metaTitle", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
          <label className="text-xs text-white/50 md:col-span-2">Translated excerpt<textarea value={activeTranslation.excerpt || ""} onChange={(e) => setTranslation("excerpt", e.target.value)} rows={3} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
          <label className="text-xs text-white/50 md:col-span-2">Translated SEO description<textarea value={activeTranslation.metaDescription || ""} onChange={(e) => setTranslation("metaDescription", e.target.value)} rows={2} className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
          <div className="md:col-span-2"><p className="mb-2 text-xs text-white/50">Translated article</p><RichTextEditor content={activeTranslation.content || "<p></p>"} onChange={(html) => setTranslation("content", html)}/></div>
        </div>
      </div>
      <div><p className="mb-2 text-xs text-white/50">Cover image</p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} className="text-sm text-white/50"/>{form.coverImage && <img src={form.coverImage} alt="" className="mt-3 h-32 rounded object-cover"/>}</div>
      <label className="flex items-center gap-3 self-end text-sm"><input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4"/> Published and visible on site</label>
    </div>
    <div className="mt-7 flex flex-wrap gap-3"><button disabled={busy || !form.title || !form.slug || !form.excerpt || !form.content} onClick={save} className="rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Working…" : editing ? "Save changes" : "Create guide"}</button><button disabled={busy || !form.content} onClick={runAudit} className="inline-flex items-center gap-2 rounded border border-white/15 px-5 py-3 text-sm"><ShieldCheck size={16}/> Audit SEO</button>{seoAudit && seoAudit.issues.length > 0 && <button disabled={busy} onClick={fixSeo} className="inline-flex items-center gap-2 rounded border border-gold/35 bg-gold/5 px-5 py-3 text-sm text-gold disabled:opacity-40"><Sparkles size={16}/> Fix SEO issues with AI</button>}{editing && <button disabled={busy} onClick={refresh} className="inline-flex items-center gap-2 rounded border border-white/15 px-5 py-3 text-sm"><RefreshCw size={16}/> Refresh with AI</button>}{!form.published && (editing !== null || form.title || form.excerpt || form.content !== "<p></p>") && <button disabled={busy} onClick={discardCurrentDraft} className="inline-flex items-center gap-2 rounded border border-red-500/25 px-5 py-3 text-sm text-red-300 disabled:opacity-40"><Trash2 size={16}/> Remove draft completely</button>}</div>
    {seoAudit && <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-white/35">SEO readiness</p><p className={`mt-1 text-4xl font-semibold ${seoAudit.score >= 80 ? "text-emerald-400" : seoAudit.score >= 60 ? "text-gold" : "text-red-400"}`}>{seoAudit.score}/100</p></div><div className="text-right text-xs text-white/40"><p>{seoAudit.stats.wordCount || 0} words</p><p>{seoAudit.stats.internalLinks || 0} internal links</p><p>{seoAudit.stats.completeTranslations || 0}/4 translations</p></div></div><div className="mt-5 space-y-2">{seoAudit.issues.map((issue) => <div key={issue.code} className={`rounded px-3 py-2 text-xs ${issue.severity === "error" ? "bg-red-500/10 text-red-300" : "bg-gold/5 text-gold/80"}`}>{issue.message} <span className="opacity-40">−{issue.points}</span></div>)}{!seoAudit.issues.length && <p className="text-sm text-emerald-400">Ready to publish.</p>}</div>{seoAudit.cannibalization.length > 0 && <div className="mt-4 border-t border-white/10 pt-4"><p className="mb-2 text-xs uppercase text-red-300">Possible competing pages</p>{seoAudit.cannibalization.map((item) => <p key={item.id} className="text-xs text-white/50">{item.title} — {item.similarity}% overlap</p>)}</div>}</div>}
    </section>
    <section className="mt-8 rounded-xl border border-gold/20 bg-gold/[0.03] p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.22em] text-gold">SEO Intelligence</p><h2 className="mt-2 font-serif text-2xl">Competitor signals</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">Tracks public homepage changes and turns them into original content opportunities grounded in your real fleet. It never copies competitor text and never publishes or changes an article automatically.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={intelligenceBusy || !intelligence.competitors.some((competitor) => competitor.active)} onClick={scanAllCompetitorsNow} className="inline-flex items-center gap-2 rounded border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-gold/30 hover:text-gold disabled:opacity-40"><RefreshCw size={14}/>{intelligenceBusy ? "Working…" : "Scan all competitors"}</button><button type="button" disabled={intelligenceBusy || !intelligence.snapshots.length} onClick={analyzeCompetitors} className="inline-flex items-center gap-2 rounded border border-gold/30 px-4 py-2 text-xs text-gold disabled:opacity-40"><Sparkles size={14}/>{intelligenceBusy ? "Working…" : "Analyze signals with AI"}</button></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_1.4fr_auto]">
        <input value={competitorForm.name} onChange={(event) => setCompetitorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Competitor name" className="rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"/>
        <input value={competitorForm.baseUrl} onChange={(event) => setCompetitorForm((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://competitor.example" className="rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"/>
        <input value={competitorForm.notes} onChange={(event) => setCompetitorForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Market, service or notes" className="rounded border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"/>
        <button type="button" disabled={intelligenceBusy || !competitorForm.name.trim() || !competitorForm.baseUrl.trim()} onClick={addCompetitor} className="rounded bg-gold px-4 py-3 text-xs font-medium text-black disabled:opacity-40">Add</button>
      </div>
      {intelligenceMessage && <p className="mt-4 rounded border border-white/10 bg-black/25 px-3 py-2 text-xs text-gold/80">{intelligenceMessage}</p>}
      <div className="mt-5 grid gap-3 md:grid-cols-2">{intelligence.competitors.map((competitor) => <div key={competitor.id} className="rounded-lg border border-white/10 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm text-white/80">{competitor.name}</p><p className="mt-1 truncate text-[10px] text-white/30">{competitor.baseUrl}</p></div><label className="flex items-center gap-2 text-[10px] text-white/40"><input type="checkbox" checked={competitor.active} onChange={async (event) => { setIntelligenceBusy(true); try { await setSeoCompetitorActive(competitor.id, event.target.checked); await loadIntelligence(); } finally { setIntelligenceBusy(false); } }}/> Active</label></div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[10px] text-white/30">{competitor.lastScannedAt ? `Last scan ${new Date(competitor.lastScannedAt).toLocaleString()}` : "Not scanned yet"}</span><button type="button" disabled={intelligenceBusy || !competitor.active} onClick={() => scanCompetitorNow(competitor.id)} className="rounded border border-white/10 px-3 py-2 text-[10px] text-white/60 hover:border-gold/30 hover:text-gold disabled:opacity-40">Scan now</button></div></div>)}</div>
      {!intelligence.competitors.length && <p className="mt-5 text-xs text-white/30">Add only competitors you want to monitor. Scanning is limited to their public HTTPS homepage and respects robots.txt.</p>}
      {intelligence.opportunities.length > 0 && <div className="mt-7"><h3 className="text-sm text-white/75">Opportunities</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{intelligence.opportunities.filter((opportunity) => opportunity.status !== "ignored").map((opportunity) => <div key={opportunity.id} className="rounded-lg border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-gold">{opportunity.priority} priority</span><span className="text-[10px] text-white/25">{opportunity.status}</span></div><p className="mt-2 text-sm text-white/80">{opportunity.title}</p><p className="mt-2 text-xs leading-5 text-white/40">{opportunity.rationale}</p><p className="mt-3 text-[10px] text-gold/60">{opportunity.keyword}{opportunity.targetPage ? ` → ${opportunity.targetPage}` : ""}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={intelligenceBusy} onClick={() => useOpportunity(opportunity)} className="rounded border border-gold/30 px-3 py-2 text-[10px] text-gold disabled:opacity-40">Add to 4-week brief</button><button type="button" disabled={intelligenceBusy} onClick={async () => { setIntelligenceBusy(true); try { await updateSeoOpportunity(opportunity.id, "ignored"); await loadIntelligence(); } finally { setIntelligenceBusy(false); } }} className="rounded border border-white/10 px-3 py-2 text-[10px] text-white/40 disabled:opacity-40">Ignore</button></div></div>)}</div></div>}
      <p className="mt-6 text-[10px] leading-4 text-white/25">For unattended daily scans, configure SEO_INTELLIGENCE_CRON_SECRET on the server and call the protected daily endpoint from your hosting scheduler. AI analysis remains a deliberate admin action to control cost and quality.</p>
    </section>
    <section id="four-week-plan" className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Four-week content plan</h2><p className="mt-1 text-xs text-white/35">AI plan grounded in the real fleet, existing clusters, search data and the latest competitor report. Default geographic balance: French Riviera, Monaco and Courchevel equally.</p></div><button type="button" disabled={busy} onClick={makePlan} className="rounded border border-gold/30 px-4 py-2 text-xs text-gold disabled:opacity-40">{busy ? "Generating…" : "Generate plan"}</button></div>
      <div className="mt-5 grid gap-4 rounded-lg border border-gold/15 bg-gold/[0.03] p-4 md:grid-cols-2">
        <label className="text-xs text-white/55 md:col-span-2">Strategic direction for AI<textarea value={planStrategy.direction} onChange={(event) => setPlanStrategy((current) => ({ ...current, direction: event.target.value }))} rows={4} placeholder="Example: The French Riviera summer season is ending. Transition the content toward Courchevel winter demand, airport transfers and premium 4x4 rentals." className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/><span className="mt-1 block text-[10px] leading-4 text-white/30">AI must use this business brief when choosing every topic for the next four weeks.</span></label>
        <label className="text-xs text-white/55">Target region<input value={planStrategy.region} onChange={(event) => setPlanStrategy((current) => ({ ...current, region: event.target.value }))} placeholder="Courchevel, French Alps" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/55">Season or campaign period<input value={planStrategy.season} onChange={(event) => setPlanStrategy((current) => ({ ...current, season: event.target.value }))} placeholder="Winter 2026/27 launch" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/55">Priority services<textarea value={planStrategy.priorityServices} onChange={(event) => setPlanStrategy((current) => ({ ...current, priorityServices: event.target.value }))} rows={2} placeholder="Geneva–Courchevel transfers, chauffeur service, 4x4 rental" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/55">Priority vehicles or yachts<textarea value={planStrategy.priorityFleet} onChange={(event) => setPlanStrategy((current) => ({ ...current, priorityFleet: event.target.value }))} rows={2} placeholder="Mercedes V-Class, Range Rover, Mercedes G-Class" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="text-xs text-white/55 md:col-span-2">Priority keywords<textarea value={planStrategy.keywords} onChange={(event) => setPlanStrategy((current) => ({ ...current, keywords: event.target.value }))} rows={2} placeholder="luxury transfer Geneva Courchevel, chauffeur Courchevel, luxury SUV rental Alps" className="mt-2 w-full rounded border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      </div>
      {savedPlans.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-xs text-white/45">Saved plan<select value={activePlanId || ""} onChange={(event) => { const id = Number(event.target.value); const plan = savedPlans.find((item) => item.id === id); setActivePlanId(id); setSeoPlan(plan?.items || []); setPlanStrategy(strategyFromPlan(plan)); }} className="ml-2 rounded border border-white/10 bg-black/50 px-3 py-2 text-white"><option value="" disabled>Select a plan</option>{savedPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>{activeSavedPlan && <span className="text-[10px] text-white/30">Saved {activeSavedPlan.updatedAt ? new Date(activeSavedPlan.updatedAt).toLocaleString() : ""}</span>}</div>}
      {planMessage && <p className={`mt-4 rounded border px-3 py-2 text-xs ${seoPlan.length ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-gold/20 bg-gold/5 text-gold"}`}>{planMessage}</p>}
      {seoPlan.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2">{seoPlan.map((item, index) => <div key={`${item.topic}-${index}`} className="rounded-lg border border-white/5 bg-black/20 p-4"><button type="button" onClick={() => usePlanItem(item)} className="w-full text-left hover:text-gold"><div className="flex items-center justify-between gap-3"><span className="text-xs text-gold">Week {item.week}</span><span className="text-[10px] uppercase text-white/30">{item.city} · {item.service}</span></div><p className="mt-2 text-sm text-white/75">{item.topic}</p><p className="mt-2 text-xs text-white/35">{item.keyword}</p></button><div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[10px] uppercase text-white/30">Progress</span><select disabled={busy || !activePlanId} value={item.status || "planned"} onChange={(event) => { if (activePlanId) void changePlanStatus(activePlanId, index, event.target.value as SeoPlanStatus); }} className="rounded border border-white/10 bg-black/50 px-2 py-1 text-[11px] text-white"><option value="planned">Planned</option><option value="drafting">Drafting</option><option value="ready">Ready</option><option value="published">Published</option><option value="skipped">Skipped</option></select></div></div>)}</div>}
    </section>
    <section className="mt-8 grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2"><div className="mb-4 flex items-center gap-2"><BarChart3 className="text-gold" size={18}/><h2 className="font-serif text-2xl">SEO performance</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="text-white/35"><tr><th className="pb-3">Article</th><th>Score</th><th>Views</th><th>Leads</th><th>GSC clicks</th><th>Position</th><th>Next action</th></tr></thead><tbody>{overview.length ? overview.map((guide) => <tr key={guide.id} className="border-t border-white/5"><td className="py-3 pr-4 text-white/70">{guide.title}</td><td>{guide.seoScore ?? "—"}</td><td>{guide.localMetrics.views}</td><td>{guide.localMetrics.leads}</td><td>{guide.searchMetrics?.clicks ?? "—"}</td><td>{guide.searchMetrics?.position ?? "—"}</td><td className="max-w-[180px] py-3 text-gold/60">{guide.opportunity || "Monitor"}</td></tr>) : <tr className="border-t border-white/5"><td colSpan={7} className="py-6 text-white/35">No guide articles yet. Create or save an AI draft first, then performance tracking will appear here.</td></tr>}</tbody></table></div></div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5"><div className="mb-4 flex items-center gap-2"><CalendarDays className="text-gold" size={18}/><h2 className="font-serif text-2xl">Calendar</h2></div>{scheduled.length ? <div className="space-y-3">{scheduled.map((guide) => <div key={guide.id} className="border-b border-white/5 pb-3"><p className="text-sm text-white/70">{guide.title}</p><p className="mt-1 text-xs text-gold/60">{new Date(guide.scheduledAt!).toLocaleString()}</p></div>)}</div> : <p className="text-sm leading-6 text-white/35">No future scheduled articles. Set “Schedule publication” on a saved guide to place it here.</p>}</div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2"><h2 className="font-serif text-2xl">Content clusters</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{clusters.map(([name, guides]) => <div key={name} className="rounded border border-white/5 bg-black/20 p-4"><p className="text-sm text-gold">{name}</p><p className="mt-1 text-xs text-white/35">{guides.length} article{guides.length === 1 ? "" : "s"} · target {guides.find((guide) => guide.targetPage)?.targetPage || "not set"}</p></div>)}</div></div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5"><h2 className="font-serif text-2xl">Import search data</h2><p className="mt-2 text-xs leading-5 text-white/35">Paste JSON exported from Search Console or Semrush: url, clicks, impressions, ctr and position.</p><textarea value={metricsJson} onChange={(e) => setMetricsJson(e.target.value)} rows={5} className="mt-4 w-full rounded border border-white/10 bg-black/40 p-3 text-xs text-white" placeholder='[{"url":"https://www.transyachtgroup.com/guides/example/","clicks":10,"impressions":400,"ctr":2.5,"position":12.4}]'/><button disabled={busy || !metricsJson.trim()} onClick={importMetrics} className="mt-3 rounded border border-gold/30 px-4 py-2 text-xs text-gold disabled:opacity-40">Import metrics</button></div>
    </section>
    <section className="mt-10 space-y-3">{items.map((guide) => <div key={guide.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-3"><h2 className="truncate font-serif text-xl">{guide.title}</h2><span className={`rounded-full px-2 py-1 text-[9px] uppercase ${guide.published ? "bg-emerald-500/10 text-emerald-400" : guide.scheduledAt && new Date(guide.scheduledAt) > new Date() ? "bg-blue-500/10 text-blue-300" : "bg-white/5 text-white/40"}`}>{guide.published ? "Published" : guide.scheduledAt && new Date(guide.scheduledAt) > new Date() ? "Scheduled" : "Draft"}</span>{guide.seoScore != null && <span className="text-xs text-gold/60">SEO {guide.seoScore}</span>}</div><p className="mt-1 truncate text-xs text-white/35">/guides/{guide.slug}/ · {guide.primaryKeyword || "no keyword"}</p></div><div className="flex gap-2"><button onClick={() => edit(guide)} className="rounded border border-white/10 p-2 text-white/60 hover:text-gold"><Pencil size={17}/></button><button onClick={() => remove(guide.id)} className="rounded border border-white/10 p-2 text-red-400/60 hover:text-red-400"><Trash2 size={17}/></button></div></div>)}</section>
  </div></div>;
}
