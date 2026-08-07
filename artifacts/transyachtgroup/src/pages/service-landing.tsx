import { useEffect, useMemo, useState } from "react";
import { Car, ChevronRight, Clock3, MapPin, ShieldCheck, Ship } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { fetchVehicles } from "@/lib/api";

type Landing = {
  slug: string;
  kind: "car" | "yacht";
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  details: string;
  brand?: string;
  area?: string;
  related: string[];
};

const LANDINGS: Landing[] = [
  {
    slug: "luxury-car-rental-cannes", kind: "car", area: "Cannes",
    title: "Luxury Car Rental in Cannes", eyebrow: "Private delivery in Cannes",
    description: "Luxury car rental in Cannes with discreet delivery to hotels, villas, Port Canto and the Croisette, supported by a dedicated concierge.",
    intro: "Choose a refined saloon, SUV or supercar for your stay in Cannes. We coordinate every request individually and arrange delivery at the agreed time and address.",
    details: "From airport arrivals and business appointments to events on the Croisette, the service is built around your schedule. Availability, rental conditions and the final quotation are confirmed personally before booking.",
    related: ["yacht-charter-cannes", "lamborghini-rental-french-riviera", "mercedes-rental-french-riviera"],
  },
  {
    slug: "luxury-car-rental-monaco", kind: "car", area: "Monaco",
    title: "Luxury Car Rental in Monaco", eyebrow: "Private delivery in Monaco",
    description: "Luxury and supercar rental in Monaco with private delivery in Monte-Carlo, Fontvieille and Port Hercule.",
    intro: "Access selected prestige vehicles for Monaco with a concierge handling the practical details from request to handover.",
    details: "We coordinate delivery around hotels, residences, marinas and event schedules. Each proposal reflects current fleet availability and the precise dates, route and driver requirements you provide.",
    related: ["yacht-charter-monaco", "ferrari-rental-french-riviera", "rolls-royce-rental-french-riviera"],
  },
  {
    slug: "luxury-car-rental-nice", kind: "car", area: "Nice",
    title: "Luxury Car Rental in Nice", eyebrow: "Nice airport and city delivery",
    description: "Luxury car rental in Nice with delivery to Nice Côte d’Azur Airport, hotels and private addresses across the French Riviera.",
    intro: "Begin your Riviera journey with a vehicle delivered to Nice airport or your chosen address. Our team coordinates timing, model selection and onward travel requirements.",
    details: "Nice is a practical arrival point for Cannes, Monaco, Antibes and Saint-Tropez. Tell us the complete itinerary so the proposal can account for delivery, collection and your preferred vehicle category.",
    related: ["luxury-car-rental-cannes", "luxury-car-rental-monaco", "mercedes-rental-french-riviera"],
  },
  {
    slug: "luxury-car-rental-saint-tropez", kind: "car", area: "Saint-Tropez",
    title: "Luxury Car Rental in Saint-Tropez", eyebrow: "Saint-Tropez and Pampelonne",
    description: "Luxury car and supercar rental in Saint-Tropez with private delivery to villas, hotels, the port and Pampelonne.",
    intro: "Arrange a luxury vehicle around your stay in Saint-Tropez, Ramatuelle or Pampelonne, with delivery planned around your arrival and accommodation.",
    details: "Seasonal demand can be high, so every model is confirmed against live availability. Our concierge can coordinate the rental with airport transfers, yacht plans and collection at the end of your stay.",
    related: ["luxury-car-rental-cannes", "lamborghini-rental-french-riviera", "ferrari-rental-french-riviera"],
  },
  {
    slug: "yacht-charter-cannes", kind: "yacht", area: "Cannes",
    title: "Luxury Yacht Charter in Cannes", eyebrow: "Private charters from Cannes",
    description: "Private luxury yacht charter in Cannes with tailored itineraries, a curated fleet and dedicated concierge support.",
    intro: "Discover the coastline from Cannes with a private yacht selected around your group, dates and preferred style of cruising.",
    details: "Departures can be coordinated from Cannes-area ports, subject to the yacht and berth. Share your guest count and desired itinerary to receive a selection with current availability and clear charter terms.",
    related: ["luxury-car-rental-cannes", "yacht-charter-monaco", "rolls-royce-rental-french-riviera"],
  },
  {
    slug: "yacht-charter-monaco", kind: "yacht", area: "Monaco",
    title: "Luxury Yacht Charter in Monaco", eyebrow: "Private charters from Monaco",
    description: "Luxury yacht charter in Monaco with a curated selection, tailored itineraries and discreet concierge coordination.",
    intro: "Plan a private charter from Monaco with a yacht matched to your guests, programme and expectations for life on board.",
    details: "Our concierge coordinates the enquiry, available yachts and practical embarkation details. Final departure point, itinerary and services are confirmed in the individual charter proposal.",
    related: ["luxury-car-rental-monaco", "yacht-charter-cannes", "ferrari-rental-french-riviera"],
  },
  {
    slug: "lamborghini-rental-french-riviera", kind: "car", brand: "Lamborghini",
    title: "Lamborghini Rental on the French Riviera", eyebrow: "Lamborghini concierge rental",
    description: "Rent a Lamborghini on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez.",
    intro: "Request a Lamborghini for a Riviera itinerary, special occasion or a distinctive driving experience, with delivery coordinated by our concierge.",
    details: "Models are shown only when present in the live fleet. Exact availability, deposit, permitted mileage and delivery conditions depend on the selected vehicle and rental dates and are confirmed before reservation.",
    related: ["ferrari-rental-french-riviera", "luxury-car-rental-cannes", "luxury-car-rental-monaco"],
  },
  {
    slug: "mercedes-rental-french-riviera", kind: "car", brand: "Mercedes",
    title: "Mercedes-Benz Rental on the French Riviera", eyebrow: "Mercedes-Benz prestige rental",
    description: "Mercedes-Benz luxury car rental on the French Riviera, with private delivery from Nice to Cannes, Monaco and Saint-Tropez.",
    intro: "Choose Mercedes-Benz comfort for executive travel, airport arrivals and longer Riviera stays, with a model selected around your priorities.",
    details: "Our live collection may include luxury saloons, performance models and SUVs. The concierge confirms the exact vehicle, delivery plan and rental conditions for your requested dates.",
    related: ["rolls-royce-rental-french-riviera", "luxury-car-rental-nice", "luxury-car-rental-cannes"],
  },
  {
    slug: "ferrari-rental-french-riviera", kind: "car", brand: "Ferrari",
    title: "Ferrari Rental on the French Riviera", eyebrow: "Ferrari concierge rental",
    description: "Ferrari rental on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez.",
    intro: "Request a Ferrari selected for an exceptional drive along the Riviera, with discreet delivery and personal booking support.",
    details: "Every enquiry is checked against current fleet availability. Vehicle-specific requirements, mileage, deposit, insurance and permitted routes are presented transparently in the individual offer.",
    related: ["lamborghini-rental-french-riviera", "luxury-car-rental-monaco", "luxury-car-rental-saint-tropez"],
  },
  {
    slug: "rolls-royce-rental-french-riviera", kind: "car", brand: "Rolls-Royce",
    title: "Rolls-Royce Rental on the French Riviera", eyebrow: "Rolls-Royce private rental",
    description: "Rolls-Royce rental on the French Riviera with discreet delivery for stays, events and private travel in Cannes and Monaco.",
    intro: "Arrange a Rolls-Royce for refined private travel, a special event or an important arrival, supported by a dedicated concierge.",
    details: "Available models and rental terms are confirmed for each request. We coordinate the chosen delivery location and timing while keeping the service personal and discreet.",
    related: ["mercedes-rental-french-riviera", "luxury-car-rental-cannes", "luxury-car-rental-monaco"],
  },
];

const UI: Record<LangCode, Record<string, string>> = {
  en: { collection: "Relevant vehicles", process: "A service built around your plans", step1: "Share your dates, destination and preferences.", step2: "Receive a tailored selection with confirmed availability.", step3: "Approve the offer and coordinate delivery or embarkation.", view: "View details", catalog: "Explore the full collection", request: "Request a private offer", faq: "Frequently asked questions", q1: "Is availability guaranteed?", a1: "Availability is confirmed personally for your exact dates before any booking is finalised.", q2: "Can delivery or embarkation be arranged?", a2: "Yes. The precise location, time and any related charge are stated in your individual offer.", related: "Related services" },
  fr: { collection: "Sélection pertinente", process: "Un service adapté à votre programme", step1: "Indiquez vos dates, votre destination et vos préférences.", step2: "Recevez une sélection personnalisée avec disponibilité confirmée.", step3: "Validez l’offre et organisez la livraison ou l’embarquement.", view: "Voir les détails", catalog: "Voir toute la collection", request: "Demander une offre privée", faq: "Questions fréquentes", q1: "La disponibilité est-elle garantie ?", a1: "La disponibilité est confirmée personnellement pour vos dates avant la réservation.", q2: "La livraison ou l’embarquement sont-ils possibles ?", a2: "Oui. Le lieu, l’heure et les éventuels frais figurent dans votre offre individuelle.", related: "Services associés" },
  ru: { collection: "Подходящие варианты", process: "Сервис под ваш маршрут", step1: "Сообщите даты, направление и пожелания.", step2: "Получите персональную подборку с подтверждённой доступностью.", step3: "Подтвердите предложение и согласуйте доставку или посадку.", view: "Подробнее", catalog: "Смотреть весь каталог", request: "Запросить персональное предложение", faq: "Частые вопросы", q1: "Доступность гарантирована?", a1: "Мы лично подтверждаем доступность на ваши даты до окончательного бронирования.", q2: "Можно организовать доставку или посадку?", a2: "Да. Точное место, время и возможная стоимость указываются в индивидуальном предложении.", related: "Похожие услуги" },
  ro: { collection: "Opțiuni relevante", process: "Un serviciu adaptat planului dvs.", step1: "Comunicați datele, destinația și preferințele.", step2: "Primiți o selecție personalizată cu disponibilitate confirmată.", step3: "Aprobați oferta și coordonați livrarea sau îmbarcarea.", view: "Detalii", catalog: "Vedeți întreaga colecție", request: "Solicitați o ofertă privată", faq: "Întrebări frecvente", q1: "Disponibilitatea este garantată?", a1: "Disponibilitatea este confirmată personal pentru datele dvs. înainte de rezervare.", q2: "Se poate organiza livrarea sau îmbarcarea?", a2: "Da. Locul, ora și eventualele costuri apar în oferta individuală.", related: "Servicii conexe" },
  ar: { collection: "خيارات مناسبة", process: "خدمة مصممة وفق خطتكم", step1: "أرسلوا التواريخ والوجهة والتفضيلات.", step2: "احصلوا على مجموعة مخصصة مع تأكيد التوفر.", step3: "وافقوا على العرض ونسقوا التسليم أو الصعود.", view: "عرض التفاصيل", catalog: "استكشف المجموعة كاملة", request: "اطلب عرضاً خاصاً", faq: "الأسئلة الشائعة", q1: "هل التوفر مضمون؟", a1: "يتم تأكيد التوفر شخصياً لتواريخكم قبل إتمام الحجز.", q2: "هل يمكن ترتيب التسليم أو الصعود؟", a2: "نعم. يوضح العرض الفردي المكان والوقت وأي تكلفة مرتبطة.", related: "خدمات ذات صلة" },
};

export default function ServiceLanding({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  const page = LANDINGS.find((item) => item.slug === slug);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const text = UI[lang];

  useEffect(() => {
    if (!page) return;
    fetchVehicles(lang, false, page.kind).then((items) => setVehicles(Array.isArray(items) ? items : [])).catch(() => setVehicles([]));
  }, [lang, page]);

  const matches = useMemo(() => {
    const filtered = page?.brand ? vehicles.filter((v) => String(v.name || "").toLowerCase().includes(page.brand!.toLowerCase())) : vehicles;
    return filtered.slice(0, 6);
  }, [page, vehicles]);

  if (!page) return <SeoHead title="404" description="Service not found." path={`/services/${slug}`} lang={lang} robots="noindex,follow" />;
  const path = `/services/${page.slug}`;
  const Icon = page.kind === "yacht" ? Ship : Car;
  const faq = [{ q: text.q1, a: text.a1 }, { q: text.q2, a: text.a2 }];

  return (
    <div className="min-h-screen bg-background text-white">
      <SeoHead title={page.title} description={page.description} path={path} lang={lang} jsonLd={[
        { "@context": "https://schema.org", "@type": "Service", name: page.title, description: page.description, serviceType: page.kind === "yacht" ? "Luxury yacht charter" : "Luxury car rental", areaServed: page.area ? { "@type": "City", name: page.area } : "French Riviera", provider: { "@id": `${SITE_URL}/#organization` }, url: `${SITE_URL}${path}?lang=${lang}` },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/?lang=${lang}` }, { "@type": "ListItem", position: 2, name: page.kind === "yacht" ? "Yachts" : "Cars", item: `${SITE_URL}/${page.kind === "yacht" ? "yachts" : "cars"}?lang=${lang}` }, { "@type": "ListItem", position: 3, name: page.title }] },
      ]} />
      <Navbar />
      <main className="px-5 pb-24 pt-36 md:pt-44">
        <article className="mx-auto max-w-6xl">
          <div className="mb-7 flex items-center gap-3 text-gold/70"><Icon size={18} /><span className="font-porter text-[10px] uppercase tracking-[0.3em]">{page.eyebrow}</span></div>
          <h1 className="max-w-5xl font-serif text-4xl leading-tight md:text-7xl">{page.title}</h1>
          <div className="my-9 h-px w-28 bg-gold/60" />
          <p className="max-w-3xl text-lg font-light leading-8 text-white/70">{page.intro}</p>
          <p className="mt-6 max-w-3xl font-light leading-7 text-white/50">{page.details}</p>

          <section className="mt-16 grid gap-5 md:grid-cols-3">
            {[<MapPin />, <ShieldCheck />, <Clock3 />].map((icon, index) => <div key={index} className="rounded-xl border border-white/10 bg-white/[0.02] p-6"><span className="mb-5 block text-gold">{icon}</span><p className="font-light leading-7 text-white/65">{text[`step${index + 1}`]}</p></div>)}
          </section>

          {matches.length > 0 && <section className="mt-20"><h2 className="mb-8 font-serif text-3xl md:text-5xl">{text.collection}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{matches.map((vehicle) => <a key={vehicle.id} href={`/vehicle/${vehicle.id}?lang=${lang}`} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-gold/40"><div className="aspect-[4/3] overflow-hidden bg-white/5"><img src={vehicle.image} alt={vehicle.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div><div className="flex items-center justify-between p-5"><h3 className="font-serif text-xl">{vehicle.name}</h3><ChevronRight className="text-gold" size={18} /></div></a>)}</div></section>}

          <section className="mt-20 grid gap-10 border-y border-white/10 py-12 md:grid-cols-2"><div><h2 className="mb-5 font-serif text-3xl">{text.faq}</h2>{faq.map((item) => <div key={item.q} className="mb-6"><h3 className="mb-2 text-sm font-medium text-gold">{item.q}</h3><p className="font-light leading-7 text-white/55">{item.a}</p></div>)}</div><div><h2 className="mb-5 font-serif text-3xl">{text.related}</h2><div className="space-y-3">{page.related.map((relatedSlug) => { const related = LANDINGS.find((item) => item.slug === relatedSlug)!; return <a key={relatedSlug} href={`/services/${relatedSlug}?lang=${lang}`} className="flex items-center justify-between border-b border-white/10 py-3 text-white/70 transition hover:text-gold"><span>{related.title}</span><ChevronRight size={16} /></a>; })}</div></div></section>

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:flex md:items-center md:justify-between md:p-10"><div><h2 className="font-serif text-3xl">{text.request}</h2><p className="mt-3 text-sm text-white/50">{text.process}</p></div><div className="mt-7 flex flex-wrap gap-3 md:mt-0"><a href={`/${page.kind === "yacht" ? "yachts" : "cars"}?lang=${lang}`} className="rounded border border-white/20 px-5 py-3 text-xs uppercase tracking-wider">{text.catalog}</a><a href={`/?lang=${lang}#request`} className="rounded bg-gold px-5 py-3 text-xs uppercase tracking-wider text-black">{text.request}</a></div></section>
        </article>
      </main>
    </div>
  );
}
