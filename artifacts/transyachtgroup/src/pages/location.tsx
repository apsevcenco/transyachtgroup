import { Car, ChevronRight, MapPin, Ship } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL, pageUrl } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

import { RelatedAnswers, useAnswers } from "@/components/RelatedAnswers";
import { answersForLocation } from "@/data/answerLinks";
import { LOCATIONS, LOCATION_SERVICES, TEXT, locationName, type LocationKey } from "@/data/locations";
import { landingTitle } from "@/data/serviceLandingsI18n";

export default function LocationPage({ city }: { city: string }) {
  const { lang, lp } = useLanguage();
  const answers = useAnswers();
  const key = city as LocationKey;
  const location = LOCATIONS[key];

  if (!location) {
    return (
      <SeoHead
        title="404"
        description="Location not found."
        path={`/locations/${city}`}
        lang={lang}
        robots="noindex,follow"
      />
    );
  }

  const text = TEXT[lang];
  const cityName = locationName(key, lang);
  const title = text.title(cityName);
  const description = text.description(cityName);
  const path = `/locations/${key}`;
  const faqItems = text.faq(cityName);

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead
        title={title}
        description={description}
        path={path}
        lang={lang}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: title,
            description,
            areaServed: {
              "@type": "City",
              name: location.name,
            },
            provider: { "@id": `${SITE_URL}/#organization` },
            serviceType: [
              "Luxury car rental",
              "Yacht charter",
              "Private concierge",
            ],
            url: pageUrl(path, lang),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: pageUrl("/", lang),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: cityName,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          },
        ]}
      />
      <Navbar />
      <main className="px-5 pb-24 pt-40">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-3 text-gold/60">
            <MapPin size={18} />
            <p className="font-porter text-[10px] uppercase tracking-[0.35em]">
              {text.service}
            </p>
          </div>
          <h1 className="section-display-title max-w-4xl">
            {title}
          </h1>
          <div className="my-10 h-px w-28 bg-gold/50" />
          <p className="max-w-3xl text-base font-light leading-8 text-white/60 md:text-lg">
            {text.intro(cityName, location.detail)}
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <a
              href={lp("/cars/")}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-gold/40"
            >
              <Car className="mb-5 text-gold" />
              <span className="flex items-center justify-between font-serif text-lg leading-snug sm:text-xl">
                {text.cars}
                <ChevronRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
            <a
              href={lp("/yachts/")}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-gold/40"
            >
              <Ship className="mb-5 text-gold" />
              <span className="flex items-center justify-between font-serif text-lg leading-snug sm:text-xl">
                {text.yachts}
                <ChevronRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
          </div>

          {LOCATION_SERVICES[key]?.length ? (
            <nav aria-label={`${cityName} services`} className="mt-8 flex flex-wrap gap-3">
              {LOCATION_SERVICES[key]!.map((service) => (
                <a
                  key={service.slug}
                  href={lp(`/services/${service.slug}/`)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-gold/40 hover:text-gold"
                >
                  {landingTitle(service.slug, lang) ?? service.label} <ChevronRight size={14} />
                </a>
              ))}
            </nav>
          ) : null}

          <section className="mt-14 rounded-xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="mb-4 font-serif text-2xl sm:text-3xl">
              {text.commercialTitle(cityName)}
            </h2>
            <p className="max-w-3xl font-light leading-8 text-white/60">
              {text.commercialCopy(cityName)}
            </p>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-xl border border-white/10 bg-black/20 p-6">
                <h2 className="mb-3 font-serif text-lg leading-snug text-white">
                  {item.question}
                </h2>
                <p className="text-sm font-light leading-7 text-white/55">
                  {item.answer}
                </p>
              </article>
            ))}
          </section>

          <RelatedAnswers
            answers={answersForLocation(answers, location.name, (LOCATION_SERVICES[key] || []).map((service) => service.slug))}
            lang={lang}
            className="mt-10"
          />

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:p-10">
            <h2 className="mb-4 font-serif text-2xl sm:text-3xl">{text.contact}</h2>
            <p className="mb-7 max-w-2xl font-light leading-7 text-white/55">
              {text.concierge}
            </p>
            <a
              href={lp("/#request")}
              className="inline-flex items-center gap-2 rounded bg-gold px-6 py-3 font-porter text-[10px] uppercase tracking-[0.2em] text-black"
            >
              {text.contact} <ChevronRight size={15} />
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
