import { Car, ChevronRight, MapPin, Ship } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

const LOCATIONS = {
  cannes: {
    name: "Cannes",
    detail:
      "the Croisette, Port Canto, Vieux Port and private addresses throughout Cannes",
  },
  monaco: {
    name: "Monaco",
    detail:
      "Monte-Carlo, Port Hercule, Fontvieille and private residences across Monaco",
  },
  nice: {
    name: "Nice",
    detail:
      "Nice Côte d’Azur Airport, the Promenade des Anglais and private addresses around Nice",
  },
  antibes: {
    name: "Antibes",
    detail:
      "Port Vauban, Cap d’Antibes, Juan-les-Pins and the surrounding coastline",
  },
  "saint-tropez": {
    name: "Saint-Tropez",
    detail:
      "the port of Saint-Tropez, Ramatuelle, Pampelonne and private villas across the peninsula",
  },
} as const;

type LocationKey = keyof typeof LOCATIONS;

const TEXT: Record<
  LangCode,
  {
    title: (city: string) => string;
    description: (city: string) => string;
    intro: (city: string, detail: string) => string;
    service: string;
    cars: string;
    yachts: string;
    concierge: string;
    contact: string;
  }
> = {
  en: {
    title: (city) => `Luxury Car Rental & Yacht Charter in ${city}`,
    description: (city) =>
      `Private luxury car rental and yacht charter in ${city} with discreet delivery and a dedicated French Riviera concierge.`,
    intro: (city, detail) =>
      `Trans Yacht Group coordinates private luxury mobility in ${city}, including ${detail}. Every request is handled individually, from vehicle delivery to yacht embarkation and tailored concierge arrangements.`,
    service: "Private mobility in the French Riviera",
    cars: "Explore luxury cars",
    yachts: "Explore yacht charters",
    concierge:
      "Tell us your dates, destination and preferences. Our concierge will prepare a tailored selection from the available fleet.",
    contact: "Request a private selection",
  },
  fr: {
    title: (city) => `Location de voitures de luxe et yachts à ${city}`,
    description: (city) =>
      `Location privée de voitures de luxe et charter de yachts à ${city}, avec livraison discrète et conciergerie dédiée.`,
    intro: (city) =>
      `Trans Yacht Group organise votre mobilité privée à ${city} et sur l’ensemble de la Côte d’Azur. Chaque demande est traitée individuellement, de la livraison du véhicule à l’embarquement sur le yacht.`,
    service: "Mobilité privée sur la Côte d’Azur",
    cars: "Découvrir les voitures",
    yachts: "Découvrir les yachts",
    concierge:
      "Indiquez-nous vos dates, votre destination et vos préférences. Notre concierge préparera une sélection personnalisée.",
    contact: "Demander une sélection privée",
  },
  ru: {
    title: (city) => `Аренда премиальных авто и яхт в ${city}`,
    description: (city) =>
      `Частная аренда премиальных автомобилей и яхт в ${city} с доставкой и персональным консьержем.`,
    intro: (city) =>
      `Trans Yacht Group организует премиальную мобильность в ${city} и по всему Лазурному Берегу. Каждая заявка сопровождается индивидуально — от доставки автомобиля до посадки на яхту.`,
    service: "Премиальная мобильность на Лазурном Берегу",
    cars: "Выбрать автомобиль",
    yachts: "Выбрать яхту",
    concierge:
      "Сообщите даты, маршрут и пожелания. Консьерж подготовит персональную подборку доступного транспорта.",
    contact: "Получить персональную подборку",
  },
  ro: {
    title: (city) => `Închirieri auto de lux și iahturi în ${city}`,
    description: (city) =>
      `Închirieri private de automobile de lux și iahturi în ${city}, cu livrare discretă și concierge dedicat.`,
    intro: (city) =>
      `Trans Yacht Group coordonează mobilitatea privată în ${city} și pe întreaga Rivieră Franceză. Fiecare solicitare este tratată individual.`,
    service: "Mobilitate privată pe Riviera Franceză",
    cars: "Descoperiți automobilele",
    yachts: "Descoperiți iahturile",
    concierge:
      "Comunicați-ne datele și preferințele, iar concierge-ul nostru va pregăti o selecție personalizată.",
    contact: "Solicitați o selecție privată",
  },
  ar: {
    title: (city) => `تأجير السيارات الفاخرة واليخوت في ${city}`,
    description: (city) =>
      `تأجير خاص للسيارات الفاخرة واليخوت في ${city} مع توصيل سري وخدمة كونسيرج مخصصة.`,
    intro: (city) =>
      `تنظم Trans Yacht Group خدمات التنقل الخاصة في ${city} وفي جميع أنحاء الريفييرا الفرنسية. تتم معالجة كل طلب بشكل فردي.`,
    service: "تنقل خاص في الريفييرا الفرنسية",
    cars: "اكتشف السيارات",
    yachts: "اكتشف اليخوت",
    concierge:
      "أرسل لنا التواريخ والوجهة والتفضيلات، وسيقوم فريق الكونسيرج بإعداد مجموعة مخصصة.",
    contact: "اطلب مجموعة خاصة",
  },
};

export default function LocationPage({ city }: { city: string }) {
  const { lang } = useLanguage();
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
  const title = text.title(location.name);
  const description = text.description(location.name);
  const path = `/locations/${key}`;

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
            url: `${SITE_URL}${path}?lang=${lang}`,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: `${SITE_URL}/?lang=${lang}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: location.name,
              },
            ],
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
          <h1 className="max-w-4xl font-serif text-4xl leading-tight md:text-7xl">
            {title}
          </h1>
          <div className="my-10 h-px w-28 bg-gold/50" />
          <p className="max-w-3xl text-base font-light leading-8 text-white/60 md:text-lg">
            {text.intro(location.name, location.detail)}
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <a
              href={`/cars?lang=${lang}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-gold/40"
            >
              <Car className="mb-5 text-gold" />
              <span className="flex items-center justify-between font-serif text-2xl">
                {text.cars}
                <ChevronRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
            <a
              href={`/yachts?lang=${lang}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-gold/40"
            >
              <Ship className="mb-5 text-gold" />
              <span className="flex items-center justify-between font-serif text-2xl">
                {text.yachts}
                <ChevronRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
          </div>

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:p-10">
            <h2 className="mb-4 font-serif text-3xl">{text.contact}</h2>
            <p className="mb-7 max-w-2xl font-light leading-7 text-white/55">
              {text.concierge}
            </p>
            <a
              href={`/?lang=${lang}#request`}
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
