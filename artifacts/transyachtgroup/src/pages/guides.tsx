import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchGuides, type Guide } from "@/lib/api";

export default function GuidesPage() {
  const { lang } = useLanguage();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchGuides(lang).then(setGuides).catch(() => setGuides([])).finally(() => setLoading(false)); }, [lang]);

  return <div className="min-h-screen bg-background text-white">
    <SeoHead title="French Riviera Luxury Travel Guides" description="Expert guides to luxury car rental, yacht charter and private travel in Cannes, Monaco, Nice and Saint-Tropez." path="/guides" lang={lang} />
    <Navbar />
    <main className="px-5 pb-24 pt-40"><div className="mx-auto max-w-6xl">
      <div className="mb-7 flex items-center gap-3 text-gold/70"><BookOpen size={18}/><span className="font-porter text-[10px] uppercase tracking-[0.3em]">Trans Yacht Group Journal</span></div>
      <h1 className="max-w-4xl font-serif text-4xl leading-tight md:text-7xl">French Riviera Luxury Travel Guides</h1>
      <p className="mt-8 max-w-3xl text-lg font-light leading-8 text-white/60">Practical local insight for private car rental, yacht charter and exceptional journeys across the Côte d’Azur.</p>
      {loading ? <p className="mt-16 text-white/35">Loading guides…</p> : guides.length === 0 ? <p className="mt-16 text-white/35">New guides are being prepared.</p> : <section className="mt-16 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{guides.map((guide) => <article key={guide.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {guide.coverImage && <a href={`/guides/${guide.slug}/?lang=${lang}`}><img src={guide.coverImage} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy"/></a>}
        <div className="p-6"><p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gold/65">{guide.publishedAt ? new Date(guide.publishedAt).toLocaleDateString(lang) : "Guide"}</p><h2 className="font-serif text-2xl leading-snug">{guide.title}</h2><p className="mt-4 line-clamp-3 font-light leading-7 text-white/50">{guide.excerpt}</p><a href={`/guides/${guide.slug}/?lang=${lang}`} className="mt-6 inline-flex items-center gap-2 text-sm text-gold">Read guide <ArrowRight size={15}/></a></div>
      </article>)}</section>}
    </div></main>
  </div>;
}
