import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { fetchAnswers, type Answer } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { ANSWERS_COPY } from "@/data/hubCopy";
import { SITE_LANGS } from "@/lib/langRoutes";

export default function AnswersPage() {
  const { lang, lp } = useLanguage();
  const copy = ANSWERS_COPY[lang];
  const [items, setItems] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnswers(lang).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [lang]);

  // A language hub exists only when at least one answer is translated into it.
  const hubLangs = loading ? undefined : SITE_LANGS.filter((code) => code === "en" || items.some((item) => item.availableLanguages?.includes(code)));

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={copy.title} description={copy.intro} path="/answers" lang={lang} langs={hubLangs} />
      <Navbar />
      <main className="px-5 pb-24 pt-36">
        <section className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-6xl">{copy.heading}</h1>
          <p className="mt-5 max-w-2xl font-light leading-8 text-white/55">{copy.lead}</p>
        </section>
        {loading ? (
          <p className="mx-auto mt-16 max-w-6xl text-white/35">{copy.loading}</p>
        ) : items.length === 0 ? (
          <p className="mx-auto mt-16 max-w-6xl text-white/35">{copy.empty}</p>
        ) : (
          <section className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/65">{item.primaryKeyword || copy.direct}</p>
                <h2 className="mt-3 font-serif text-2xl leading-tight">{item.question}</h2>
                <p className="mt-4 line-clamp-4 font-light leading-7 text-white/55">{item.directAnswer}</p>
                <a href={item.language === lang ? lp(`/answers/${item.slug}/`) : `/answers/${item.slug}/`} className="mt-6 inline-flex items-center gap-2 text-sm text-gold">{copy.read} <ArrowRight size={15} /></a>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
