import { useEffect, useMemo, useState } from "react";
import { Car, ChevronRight, Clock3, MapPin, ShieldCheck, Ship } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { fetchVehicles } from "@/lib/api";
import { stripCmsText } from "@/lib/utils";
import { vehiclePath } from "@/lib/vehicleSeo";

import { RelatedAnswers, useAnswers } from "@/components/RelatedAnswers";
import { answersForService } from "@/data/answerLinks";
import { COURCHEVEL_CLUSTER_SLUGS, LANDINGS, UI, type Landing } from "@/data/serviceLandings";

export default function ServiceLanding({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const page = LANDINGS.find((item) => item.slug === slug);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const text = UI[lang];
  const answers = useAnswers();

  useEffect(() => {
    if (!page) return;
    fetchVehicles(lang, false, page.kind).then((items) => setVehicles(Array.isArray(items) ? items : [])).catch(() => setVehicles([]));
  }, [lang, page]);

  const matches = useMemo(() => {
    const filtered = page?.brand
      ? vehicles.filter((v) => stripCmsText(v.name).toLowerCase().includes(page.brand!.toLowerCase()))
      : page?.vehicleKeywords?.length
        ? vehicles.filter((v) => page.vehicleKeywords!.some((keyword) => stripCmsText(v.name).toLowerCase().includes(keyword)))
        : vehicles;
    return filtered.slice(0, 6);
  }, [page, vehicles]);

  if (!page) return <SeoHead title="404" description="Service not found." path={`/services/${slug}`} lang={lang} robots="noindex,follow" />;
  const path = `/services/${page.slug}`;
  const Icon = page.kind === "yacht" ? Ship : Car;
  const faq = page.faq || [{ q: text.q1, a: text.a1 }, { q: text.q2, a: text.a2 }];
  const clusterLinks = page.area === "Courchevel"
    ? COURCHEVEL_CLUSTER_SLUGS
      .filter((clusterSlug) => clusterSlug !== page.slug)
      .map((clusterSlug) => LANDINGS.find((item) => item.slug === clusterSlug))
      .filter((item): item is Landing => Boolean(item))
    : [];

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={page.title} description={page.description} path={path} lang={lang} jsonLd={[
        { "@context": "https://schema.org", "@type": "Service", name: page.title, description: page.description, serviceType: page.serviceType || (page.kind === "yacht" ? "Luxury yacht charter" : "Luxury car rental"), areaServed: page.area ? { "@type": "City", name: page.area } : "French Riviera", provider: { "@id": `${SITE_URL}/#organization` }, url: `${SITE_URL}${path}/` },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: page.kind === "yacht" ? "Yachts" : "Cars", item: `${SITE_URL}/${page.kind === "yacht" ? "yachts" : "cars"}/` }, { "@type": "ListItem", position: 3, name: page.title }] },
      ]} />
      <Navbar />
      <main className="px-5 pb-24 pt-36 md:pt-44">
        <article className="mx-auto max-w-6xl">
          <div className="mb-7 flex items-center gap-3 text-gold/70"><Icon size={18} /><span className="font-porter text-[10px] uppercase tracking-[0.3em]">{page.eyebrow}</span></div>
          <h1 className="section-display-title max-w-5xl">{page.title}</h1>
          <div className="my-9 h-px w-28 bg-gold/60" />
          <p className="max-w-3xl text-lg font-light leading-8 text-white/70">{page.intro}</p>
          <p className="mt-6 max-w-3xl font-light leading-7 text-white/50">{page.details}</p>

          <section className="mt-16 grid gap-5 md:grid-cols-3">
            {[<MapPin />, <ShieldCheck />, <Clock3 />].map((icon, index) => <div key={index} className="rounded-xl border border-white/10 bg-white/[0.02] p-6"><span className="mb-5 block text-gold">{icon}</span><p className="font-light leading-7 text-white/65">{text[`step${index + 1}`]}</p></div>)}
          </section>

          {matches.length > 0 && (
            <section className="mt-20">
              <h2 className="mb-8 font-serif text-2xl leading-tight sm:text-3xl">{text.collection}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((vehicle) => {
                  const vehicleName = stripCmsText(vehicle.name) || (page.kind === "yacht" ? "Yacht" : "Vehicle");
                  const vehicleDescription = stripCmsText(vehicle.description);

                  return (
                    <a
                      key={vehicle.id}
                      href={`${vehiclePath(vehicle)}/`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-gold/40"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-white/5">
                        <img
                          src={vehicle.image}
                          alt={vehicleName}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 items-start justify-between gap-4 p-5 sm:p-6">
                        <div className="min-w-0">
                          <h3 className="font-serif text-base leading-snug sm:text-lg">{vehicleName}</h3>
                          {vehicleDescription ? (
                            <p className="mt-2 line-clamp-2 text-sm font-light leading-6 text-white/45">
                              {vehicleDescription}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight className="mt-1 shrink-0 text-gold" size={18} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-20 grid gap-10 border-y border-white/10 py-12 md:grid-cols-2"><div><h2 className="mb-5 font-serif text-2xl sm:text-3xl">{text.faq}</h2>{faq.map((item) => <div key={item.q} className="mb-6"><h3 className="mb-2 text-sm font-medium text-gold">{item.q}</h3><p className="font-light leading-7 text-white/55">{item.a}</p></div>)}</div><div><h2 className="mb-5 font-serif text-2xl sm:text-3xl">{text.related}</h2><div className="space-y-3">{page.related.map((relatedSlug) => { const related = LANDINGS.find((item) => item.slug === relatedSlug)!; return <a key={relatedSlug} href={`/services/${relatedSlug}/`} className="flex items-center justify-between border-b border-white/10 py-3 text-white/70 transition hover:text-gold"><span>{related.title}</span><ChevronRight size={16} /></a>; })}</div></div></section>

          {clusterLinks.length > 0 && (
            <section className="mt-14 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <div className="mb-6 max-w-3xl">
                <h2 className="font-serif text-2xl sm:text-3xl">{text.cluster}</h2>
                <p className="mt-3 font-light leading-7 text-white/50">{text.clusterIntro}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clusterLinks.map((clusterPage) => (
                  <a key={clusterPage.slug} href={`/services/${clusterPage.slug}/`} className="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65 transition hover:border-gold/40 hover:text-gold">
                    <span>{clusterPage.title}</span>
                    <ChevronRight size={16} className="shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <RelatedAnswers answers={answersForService(answers, page.slug, page.area)} lang={lang} />

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:flex md:items-center md:justify-between md:p-10"><div><h2 className="font-serif text-2xl sm:text-3xl">{text.request}</h2><p className="mt-3 text-sm text-white/50">{text.process}</p></div><div className="mt-7 flex flex-wrap gap-3 md:mt-0"><a href={`/${page.kind === "yacht" ? "yachts" : "cars"}/`} className="rounded border border-white/20 px-5 py-3 text-xs uppercase tracking-wider">{text.catalog}</a><a href="/#request" className="rounded bg-gold px-5 py-3 text-xs uppercase tracking-wider text-black">{text.request}</a></div></section>
        </article>
      </main>
    </div>
  );
}
