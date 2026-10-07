import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { fetchAnswers, type Answer } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AnswersPage() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnswers().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead
        title="Luxury Travel Answers"
        description="Direct answers about luxury car rental, VIP transfers, yacht charter, Monaco, the French Riviera and Courchevel."
        path="/answers"
        lang={lang}
      />
      <Navbar />
      <main className="px-5 pb-24 pt-36">
        <section className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/70">AI Answers</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-6xl">Fast answers for premium travel decisions</h1>
          <p className="mt-5 max-w-2xl font-light leading-8 text-white/55">Concise, structured answers designed for clients and AI search engines: transfers, luxury car rental, yacht charter and VIP mobility.</p>
        </section>
        {loading ? (
          <p className="mx-auto mt-16 max-w-6xl text-white/35">Loading answers…</p>
        ) : items.length === 0 ? (
          <p className="mx-auto mt-16 max-w-6xl text-white/35">Answer pages are being prepared.</p>
        ) : (
          <section className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/65">{item.primaryKeyword || "Direct answer"}</p>
                <h2 className="mt-3 font-serif text-2xl leading-tight">{item.question}</h2>
                <p className="mt-4 line-clamp-4 font-light leading-7 text-white/55">{item.directAnswer}</p>
                <a href={`/answers/${item.slug}/`} className="mt-6 inline-flex items-center gap-2 text-sm text-gold">Read answer <ArrowRight size={15} /></a>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
