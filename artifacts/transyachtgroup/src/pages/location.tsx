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
  courchevel: {
    name: "Courchevel",
    detail:
      "Courchevel 1850, luxury chalets, private hotels and airport transfers from Geneva, Lyon, Chambéry and Nice",
  },
} as const;

type LocationKey = keyof typeof LOCATIONS;

const LOCATION_SERVICES: Partial<Record<LocationKey, { slug: string; label: string }[]>> = {
  cannes: [
    { slug: "luxury-car-rental-cannes", label: "Luxury car rental in Cannes" },
    { slug: "yacht-charter-cannes", label: "Luxury yacht charter in Cannes" },
  ],
  monaco: [
    { slug: "luxury-car-rental-monaco", label: "Luxury car rental in Monaco" },
    { slug: "yacht-charter-monaco", label: "Luxury yacht charter in Monaco" },
  ],
  nice: [{ slug: "luxury-car-rental-nice", label: "Luxury car rental in Nice" }],
  "saint-tropez": [{ slug: "luxury-car-rental-saint-tropez", label: "Luxury car rental in Saint-Tropez" }],
  courchevel: [
    { slug: "private-jet-to-car-transfer-courchevel", label: "Private jet to car transfer in Courchevel" },
    { slug: "courchevel-private-transfers", label: "Private transfers to Courchevel" },
  ],
};

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
    commercialTitle: (city: string) => string;
    commercialCopy: (city: string) => string;
    faq: (city: string) => { question: string; answer: string }[];
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
    commercialTitle: (city) => `Private luxury transport in ${city}`,
    commercialCopy: (city) =>
      `Book chauffeured luxury cars, self-drive supercars, VIP airport transfers and private yacht connections in ${city}. We focus on discreet service, premium vehicles, flexible delivery and fast concierge response for high-value private and corporate clients.`,
    faq: (city) => [
      {
        question: `Can I book a luxury car with chauffeur in ${city}?`,
        answer: `Yes. Trans Yacht Group arranges chauffeured luxury vehicles, executive transfers and private car rental in ${city} with concierge support.`,
      },
      {
        question: `Do you offer airport transfers to ${city}?`,
        answer: `Yes. We coordinate VIP transfers from the main regional airports, private terminals and hotels, depending on your itinerary.`,
      },
      {
        question: `Can I request a yacht or car together in ${city}?`,
        answer: `Yes. Our team can combine a premium car, yacht charter and concierge services into one private itinerary.`,
      },
    ],
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
    commercialTitle: (city) => `Transport privé de luxe à ${city}`,
    commercialCopy: (city) =>
      `Réservez voitures de luxe avec chauffeur, supercars, transferts VIP aéroport et connexions yacht privées à ${city}. Notre service privilégie la discrétion, les véhicules premium, la livraison flexible et une réponse rapide pour clients privés et corporate.`,
    faq: (city) => [
      {
        question: `Puis-je réserver une voiture de luxe avec chauffeur à ${city} ?`,
        answer: `Oui. Trans Yacht Group organise voitures de luxe avec chauffeur, transferts exécutifs et location privée à ${city}.`,
      },
      {
        question: `Proposez-vous des transferts aéroport vers ${city} ?`,
        answer: `Oui. Nous coordonnons les transferts VIP depuis les principaux aéroports, terminaux privés et hôtels selon votre itinéraire.`,
      },
      {
        question: `Puis-je demander un yacht et une voiture à ${city} ?`,
        answer: `Oui. Notre équipe peut combiner voiture premium, yacht charter et conciergerie dans un itinéraire privé.`,
      },
    ],
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
    commercialTitle: (city) => `Частный люксовый транспорт в ${city}`,
    commercialCopy: (city) =>
      `Забронируйте премиальный автомобиль с водителем, суперкар, VIP-трансфер из аэропорта или связку авто и яхты в ${city}. Мы делаем акцент на приватность, высокий уровень машин, гибкую доставку и быстрый консьерж-сервис для частных и корпоративных клиентов.`,
    faq: (city) => [
      {
        question: `Можно ли заказать премиальное авто с водителем в ${city}?`,
        answer: `Да. Trans Yacht Group организует автомобили с водителем, VIP-трансферы и частную аренду премиальных машин в ${city}.`,
      },
      {
        question: `Есть ли трансферы из аэропорта в ${city}?`,
        answer: `Да. Мы организуем VIP-трансферы из основных аэропортов, частных терминалов и отелей по вашему маршруту.`,
      },
      {
        question: `Можно ли заказать авто и яхту вместе в ${city}?`,
        answer: `Да. Команда может объединить премиальное авто, яхт-чартер и консьерж-сервис в один частный маршрут.`,
      },
    ],
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
    commercialTitle: (city) => `Transport privat de lux în ${city}`,
    commercialCopy: (city) =>
      `Rezervați automobile de lux cu șofer, supercaruri, transferuri VIP de la aeroport și conexiuni private cu iahturi în ${city}. Serviciul nostru pune accent pe discreție, vehicule premium, livrare flexibilă și concierge rapid.`,
    faq: (city) => [
      {
        question: `Pot rezerva o mașină de lux cu șofer în ${city}?`,
        answer: `Da. Trans Yacht Group organizează automobile de lux cu șofer, transferuri executive și închirieri private în ${city}.`,
      },
      {
        question: `Oferiți transferuri de la aeroport către ${city}?`,
        answer: `Da. Coordonăm transferuri VIP de la aeroporturi, terminale private și hoteluri în funcție de itinerariu.`,
      },
      {
        question: `Pot solicita iaht și mașină împreună în ${city}?`,
        answer: `Da. Echipa poate combina automobil premium, yacht charter și concierge într-un itinerariu privat.`,
      },
    ],
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
    commercialTitle: (city) => `تنقل فاخر خاص في ${city}`,
    commercialCopy: (city) =>
      `احجز سيارات فاخرة مع سائق، سيارات سوبركار، انتقالات VIP من المطار وخدمات ربط خاصة باليخوت في ${city}. نركز على الخصوصية، السيارات الراقية، التسليم المرن والاستجابة السريعة لعملاء النخبة والشركات.`,
    faq: (city) => [
      {
        question: `هل يمكن حجز سيارة فاخرة مع سائق في ${city}؟`,
        answer: `نعم. تنظم Trans Yacht Group سيارات فاخرة مع سائق، انتقالات تنفيذية وتأجير سيارات خاص في ${city}.`,
      },
      {
        question: `هل تقدمون انتقالات من المطار إلى ${city}؟`,
        answer: `نعم. ننسق انتقالات VIP من المطارات الرئيسية والمحطات الخاصة والفنادق حسب خط سير الرحلة.`,
      },
      {
        question: `هل يمكن طلب يخت وسيارة معاً في ${city}؟`,
        answer: `نعم. يمكن لفريقنا دمج سيارة فاخرة ويخت وخدمات كونسيرج ضمن برنامج خاص واحد.`,
      },
    ],
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
  const faqItems = text.faq(location.name);

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
            url: `${SITE_URL}${path}/?lang=${lang}`,
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
            {text.intro(location.name, location.detail)}
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <a
              href={`/cars/?lang=${lang}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-7 transition hover:border-gold/40"
            >
              <Car className="mb-5 text-gold" />
              <span className="flex items-center justify-between font-serif text-lg leading-snug sm:text-xl">
                {text.cars}
                <ChevronRight className="transition group-hover:translate-x-1" />
              </span>
            </a>
            <a
              href={`/yachts/?lang=${lang}`}
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
            <nav aria-label={`${location.name} services`} className="mt-8 flex flex-wrap gap-3">
              {LOCATION_SERVICES[key]!.map((service) => (
                <a
                  key={service.slug}
                  href={`/services/${service.slug}/?lang=${lang}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-gold/40 hover:text-gold"
                >
                  {service.label} <ChevronRight size={14} />
                </a>
              ))}
            </nav>
          ) : null}

          <section className="mt-14 rounded-xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <h2 className="mb-4 font-serif text-2xl sm:text-3xl">
              {text.commercialTitle(location.name)}
            </h2>
            <p className="max-w-3xl font-light leading-8 text-white/60">
              {text.commercialCopy(location.name)}
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

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:p-10">
            <h2 className="mb-4 font-serif text-2xl sm:text-3xl">{text.contact}</h2>
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
