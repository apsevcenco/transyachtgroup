import { useEffect, useState } from "react";
import { ArrowRight, Newspaper } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { NEWS_COPY } from "@/data/hubCopy";
import { SITE_LANGS, articleLangs } from "@/lib/langRoutes";
import { fetchNews, type News } from "@/lib/api";

export default function NewsPage() {
  const { lang, lp } = useLanguage();
  const copy = NEWS_COPY[lang];
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews(lang).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [lang]);

  // A language hub exists only when at least one article is translated into it.
  const hubLangs = loading ? undefined : SITE_LANGS.filter((code) => code === "en" || items.some((entry) => articleLangs(entry).includes(code)));
  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={copy.title} description={copy.intro} path="/news" lang={lang} langs={hubLangs} />
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
                  {item.coverImage && <a href={lp(`/news/${item.slug}/`)}><img src={item.coverImage} alt={item.title} className="aspect-[16/10] w-full object-cover" loading="lazy" /></a>}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gold/65">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString(lang) : "News"}</p>
                    <h2 className="line-clamp-3 text-balance font-serif text-lg leading-[1.3] sm:text-xl">{item.title}</h2>
                    <p className="mt-4 line-clamp-3 font-light leading-7 text-white/50">{item.excerpt}</p>
                    <a href={lp(`/news/${item.slug}/`)} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-gold">{copy.read} <ArrowRight size={15} /></a>
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
