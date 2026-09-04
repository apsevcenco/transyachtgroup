import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchNewsItem, type News } from "@/lib/api";

export default function NewsDetail({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsItem(slug, lang).then(setItem).catch(() => setItem(null)).finally(() => setLoading(false));
  }, [slug, lang]);

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={item?.metaTitle || item?.title || "News"} description={item?.metaDescription || item?.excerpt || ""} path={`/news/${slug}`} lang={lang} />
      <Navbar />
      <main className="px-5 pb-24 pt-36">
        <article className="mx-auto max-w-4xl">
          <a href={`/news/?lang=${lang}`} className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-gold"><ArrowLeft size={15} /> News</a>
          {loading ? (
            <p className="text-white/35">Loading news…</p>
          ) : !item ? (
            <p className="text-white/35">News article not found.</p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString(lang) : "Trans Yacht Group News"}</p>
              <h1 className="mt-5 text-balance font-serif text-4xl leading-tight text-white sm:text-6xl">{item.title}</h1>
              <p className="mt-6 text-lg font-light leading-8 text-white/60">{item.excerpt}</p>
              {item.coverImage && <img src={item.coverImage} alt="" className="mt-10 aspect-[16/9] w-full rounded-xl object-cover" />}
              <div className="prose prose-invert prose-a:text-gold prose-headings:font-serif prose-headings:text-white prose-p:font-light prose-p:leading-8 prose-p:text-white/65 mt-12 max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
              {item.gallery?.length > 0 && (
                <section className="mt-14">
                  <h2 className="font-serif text-2xl">Gallery</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {item.gallery.slice(0, 10).map((url, index) => (
                      <img key={`${url}-${index}`} src={url} alt="" className="aspect-[4/3] rounded-lg object-cover" loading="lazy" />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </article>
      </main>
    </div>
  );
}
