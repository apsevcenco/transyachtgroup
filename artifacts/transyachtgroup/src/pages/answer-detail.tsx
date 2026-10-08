import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { CmsContent } from "@/components/CmsContent";
import { RelatedAnswers, useAnswers } from "@/components/RelatedAnswers";
import { moreAnswers } from "@/data/answerLinks";
import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { fetchAnswer, type Answer } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AnswerDetail({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const [item, setItem] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(true);
  const allAnswers = useAnswers();

  useEffect(() => {
    fetchAnswer(slug).then(setItem).catch(() => setItem(null)).finally(() => setLoading(false));
  }, [slug]);

  const path = `/answers/${slug}`;
  const url = `${SITE_URL}${path}/`;
  const jsonLd = item ? [
    {
      "@context": "https://schema.org",
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.directAnswer },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (item.faq || []).map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Answers", item: `${SITE_URL}/answers/` },
        { "@type": "ListItem", position: 3, name: item.question, item: url },
      ],
    },
  ] : undefined;

  if (!loading && !item) {
    return <div className="min-h-screen bg-background text-white"><SeoHead title="Answer not found" description="The requested answer is unavailable." path={path} lang={lang} robots="noindex,follow" /><Navbar /><main className="px-5 pt-40 text-center">Answer not found.</main></div>;
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={item?.metaTitle || item?.question || "Answer"} description={item?.metaDescription || item?.directAnswer || ""} path={path} lang={lang} langs={["en"]} jsonLd={jsonLd} />
      <Navbar />
      <main className="px-5 pb-24 pt-36">
        <article className="mx-auto max-w-4xl">
          <a href="/answers/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-gold"><ArrowLeft size={15} /> Answers</a>
          {loading ? (
            <p className="text-white/35">Loading answer…</p>
          ) : item ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/70">{item.primaryKeyword || "AI Answer"}</p>
              <h1 className="mt-5 font-serif text-4xl leading-tight md:text-6xl">{item.question}</h1>
              <section className="mt-8 rounded-xl border border-gold/25 bg-gold/10 p-6">
                <h2 className="text-sm uppercase tracking-[0.22em] text-gold">Direct answer</h2>
                <p className="mt-4 font-light leading-8 text-white/75">{item.directAnswer}</p>
              </section>
              <CmsContent html={item.explanation} as="div" className="prose prose-invert prose-a:text-gold prose-headings:font-serif prose-headings:text-white prose-p:font-light prose-p:leading-8 prose-p:text-white/65 mt-12 max-w-none" />
              {item.faq?.length > 0 && (
                <section className="mt-12 border-t border-white/10 pt-8">
                  <h2 className="font-serif text-3xl">Frequently asked questions</h2>
                  <div className="mt-6 space-y-5">
                    {item.faq.map((faq, index) => (
                      <div key={`${faq.question}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                        <h3 className="font-serif text-xl">{faq.question}</h3>
                        <p className="mt-3 font-light leading-7 text-white/60">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <RelatedAnswers answers={moreAnswers(allAnswers, item)} lang={lang} className="mt-12" />
              {item.relatedServicePath && <a href={item.relatedServicePath} className="mt-10 inline-flex rounded bg-gold px-5 py-3 text-sm font-medium text-black">View related service</a>}
            </>
          ) : null}
        </article>
      </main>
    </div>
  );
}
