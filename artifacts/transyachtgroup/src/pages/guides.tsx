import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { fetchGuides, type Guide } from "@/lib/api";

const COPY: Record<LangCode, { title: string; intro: string; loading: string; empty: string; guide: string; read: string }> = {
  en: { title: "French Riviera Luxury Travel Guides", intro: "Practical local insight for private car rental, yacht charter and exceptional journeys across the Côte d’Azur.", loading: "Loading guides…", empty: "New guides are being prepared.", guide: "Guide", read: "Read guide" },
  fr: { title: "Guides de voyage de luxe sur la Côte d’Azur", intro: "Conseils locaux pour la location de voitures de prestige, le charter de yachts et des voyages d’exception sur la Côte d’Azur.", loading: "Chargement des guides…", empty: "De nouveaux guides sont en préparation.", guide: "Guide", read: "Lire le guide" },
  ru: { title: "Гайды по премиальному отдыху на Лазурном Берегу", intro: "Практические рекомендации по аренде премиальных автомобилей, яхт и организации исключительных путешествий по Лазурному Берегу.", loading: "Загрузка гайдов…", empty: "Новые гайды готовятся к публикации.", guide: "Гайд", read: "Читать гайд" },
  ro: { title: "Ghiduri de călătorie de lux pe Riviera Franceză", intro: "Recomandări locale pentru închirieri auto premium, charter de iahturi și călătorii excepționale pe Coasta de Azur.", loading: "Se încarcă ghidurile…", empty: "Pregătim ghiduri noi.", guide: "Ghid", read: "Citiți ghidul" },
  ar: { title: "أدلة السفر الفاخر في الريفييرا الفرنسية", intro: "نصائح محلية عملية لتأجير السيارات الفاخرة واستئجار اليخوت والرحلات الاستثنائية على الريفييرا الفرنسية.", loading: "جارٍ تحميل الأدلة…", empty: "يجري إعداد أدلة جديدة.", guide: "دليل", read: "قراءة الدليل" },
};

export default function GuidesPage() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchGuides(lang).then(setGuides).catch(() => setGuides([])).finally(() => setLoading(false)); }, [lang]);

  return <div className="min-h-screen bg-background text-white">
    <SeoHead title={copy.title} description={copy.intro} path="/guides" lang={lang} />
    <Navbar />
    <main className="px-5 pb-24 pt-40"><div className="mx-auto max-w-6xl">
      <div className="mb-7 flex items-center gap-3 text-gold/70"><BookOpen size={18}/><span className="font-porter text-[10px] uppercase tracking-[0.3em]">Trans Yacht Group Journal</span></div>
      <h1 className="max-w-4xl text-balance font-serif text-3xl leading-[1.12] sm:text-4xl md:text-5xl lg:text-[3.5rem]">{copy.title}</h1>
      <p className="mt-7 max-w-3xl text-base font-light leading-7 text-white/60 sm:text-lg sm:leading-8">{copy.intro}</p>
      {loading ? <p className="mt-16 text-white/35">{copy.loading}</p> : guides.length === 0 ? <p className="mt-16 text-white/35">{copy.empty}</p> : <section className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{guides.map((guide) => <article key={guide.id} className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {guide.coverImage && <a href={`/guides/${guide.slug}/?lang=${lang}`}><img src={guide.coverImage} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy"/></a>}
        <div className="flex flex-1 flex-col p-6"><p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gold/65">{guide.publishedAt ? new Date(guide.publishedAt).toLocaleDateString(lang) : copy.guide}</p><h2 className="line-clamp-3 text-balance font-serif text-lg leading-[1.3] sm:text-xl">{guide.title}</h2><p className="mt-4 line-clamp-3 font-light leading-7 text-white/50">{guide.excerpt}</p><a href={`/guides/${guide.slug}/?lang=${lang}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-gold">{copy.read} <ArrowRight size={15}/></a></div>
      </article>)}</section>}
    </div></main>
  </div>;
}
