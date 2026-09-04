import { useEffect, useState } from "react";
import { ArrowRight, Newspaper } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { fetchNews, type News } from "@/lib/api";

const COPY: Record<LangCode, { title: string; intro: string; loading: string; empty: string; read: string }> = {
  en: { title: "News from Trans Yacht Group", intro: "Latest updates on luxury cars, VIP transfers and premium mobility across Monaco, the French Riviera and Courchevel.", loading: "Loading news…", empty: "News articles are being prepared.", read: "Read news" },
  fr: { title: "Actualités de Trans Yacht Group", intro: "Dernières nouvelles sur les voitures de luxe, les transferts VIP et la mobilité premium à Monaco, sur la Côte d’Azur et à Courchevel.", loading: "Chargement des actualités…", empty: "Les actualités sont en préparation.", read: "Lire l’actualité" },
  ru: { title: "Новости Trans Yacht Group", intro: "Свежие новости о премиальных автомобилях, VIP-трансферах, Монако, Лазурном Береге и Куршавеле.", loading: "Загрузка новостей…", empty: "Новости готовятся к публикации.", read: "Читать новость" },
  ro: { title: "Noutăți Trans Yacht Group", intro: "Actualizări despre mașini de lux, transferuri VIP și mobilitate premium în Monaco, Riviera Franceză și Courchevel.", loading: "Se încarcă noutățile…", empty: "Pregătim articole noi.", read: "Citiți știrea" },
  ar: { title: "أخبار ترانس يخت غروب", intro: "آخر الأخبار حول السيارات الفاخرة والتنقل الخاص في موناكو والريفييرا الفرنسية وكورشوفيل.", loading: "جارٍ تحميل الأخبار…", empty: "يجري إعداد الأخبار.", read: "قراءة الخبر" },
};

export default function NewsPage() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews(lang).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [lang]);

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={copy.title} description={copy.intro} path="/news" lang={lang} />
      <Navbar />
      <main className="px-5 pb-24 pt-40">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex items-center gap-3 text-gold/70">
            <Newspaper size={18} />
            <span className="font-porter text-[10px] uppercase tracking-[0.3em]">Trans Yacht Group News</span>
          </div>
          <h1 className="section-display-title max-w-5xl text-balance font-serif text-white">{copy.title}</h1>
          <p className="mt-7 max-w-3xl text-base font-light leading-7 text-white/60 sm:text-lg sm:leading-8">{copy.intro}</p>
          {loading ? (
            <p className="mt-16 text-white/35">{copy.loading}</p>
          ) : items.length === 0 ? (
            <p className="mt-16 text-white/35">{copy.empty}</p>
          ) : (
            <section className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                  {item.coverImage && <a href={`/news/${item.slug}/?lang=${lang}`}><img src={item.coverImage} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" /></a>}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gold/65">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString(lang) : "News"}</p>
                    <h2 className="line-clamp-3 text-balance font-serif text-lg leading-[1.3] sm:text-xl">{item.title}</h2>
                    <p className="mt-4 line-clamp-3 font-light leading-7 text-white/50">{item.excerpt}</p>
                    <a href={`/news/${item.slug}/?lang=${lang}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-gold">{copy.read} <ArrowRight size={15} /></a>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
