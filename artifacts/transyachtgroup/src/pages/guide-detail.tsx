import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { CmsContent } from "@/components/CmsContent";
import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchGuide, type Guide } from "@/lib/api";
import { trackEvent } from "@/hooks/useAnalytics";

export default function GuideDetail({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); fetchGuide(slug, lang).then(setGuide).catch(() => setFailed(true)); }, [slug, lang]);
  if (failed) return <div className="min-h-screen bg-background text-white"><SeoHead title="Guide not found" description="The requested guide is unavailable." path={`/guides/${slug}`} lang={lang} robots="noindex,follow"/><Navbar/><main className="px-5 pt-40 text-center">Guide not found.</main></div>;
  if (!guide) return <div className="min-h-screen bg-background text-white"><Navbar/><main className="px-5 pt-40 text-center text-white/40">Loading…</main></div>;
  const title = guide.metaTitle || guide.title;
  const description = guide.metaDescription || guide.excerpt;
  const path = `/guides/${guide.slug}`;
  return <div className="min-h-screen bg-background text-white">
    <SeoHead title={title} description={description} path={path} lang={lang} image={guide.coverImage || undefined} type="website" jsonLd={[
      { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description, image: guide.coverImage || `${SITE_URL}/opengraph.jpg`, datePublished: guide.publishedAt, dateModified: guide.updatedAt, author: { "@id": `${SITE_URL}/#organization` }, publisher: { "@id": `${SITE_URL}/#organization` }, mainEntityOfPage: `${SITE_URL}${path}/?lang=${lang}` },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/?lang=${lang}` }, { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides/?lang=${lang}` }, { "@type": "ListItem", position: 3, name: guide.title }] },
    ]}/>
    <Navbar/><main className="px-5 pb-24 pt-36 md:pt-44"><article className="mx-auto max-w-4xl">
      <a href={`/guides/?lang=${lang}`} className="mb-10 inline-flex items-center gap-2 text-sm text-white/45 hover:text-gold"><ArrowLeft size={16}/> All guides</a>
      <h1 className="section-display-title max-w-3xl text-balance break-words font-serif text-white">{guide.title}</h1><p className="mt-7 text-base font-light leading-7 text-white/60 sm:text-lg sm:leading-8">{guide.excerpt}</p>
      {guide.coverImage && <img src={guide.coverImage} alt="" className="mt-10 aspect-[16/9] w-full rounded-xl object-cover"/>}
      <div onClick={(event) => { const anchor = (event.target as HTMLElement).closest("a"); if (anchor) trackEvent("click", { source: "guide", guide: guide.slug, destination: anchor.getAttribute("href") }); }}><CmsContent html={guide.content} as="div" className="prose prose-invert prose-lg mt-12 max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-gold prose-p:text-white/65 prose-li:text-white/65"/></div>
    </article></main>
  </div>;
}
