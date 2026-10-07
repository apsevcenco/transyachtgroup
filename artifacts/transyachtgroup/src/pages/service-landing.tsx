import { useEffect, useMemo, useState } from "react";
import { Car, ChevronRight, Clock3, MapPin, ShieldCheck, Ship } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { fetchVehicles } from "@/lib/api";
import { stripCmsText } from "@/lib/utils";
import { vehiclePath } from "@/lib/vehicleSeo";

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
  serviceType?: string;
  vehicleKeywords?: string[];
  faq?: Array<{ q: string; a: string }>;
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
    related: ["yacht-charter-saint-tropez", "lamborghini-rental-french-riviera", "ferrari-rental-french-riviera"],
  },
  {
    slug: "luxury-car-rental-antibes", kind: "car", area: "Antibes",
    title: "Luxury Car Rental in Antibes", eyebrow: "Antibes, Cap d’Antibes and Juan-les-Pins",
    description: "Luxury car rental in Antibes and Cap d’Antibes with discreet delivery to hotels, villas, marinas and private residences.",
    intro: "Coordinate a luxury car rental in Antibes around your villa, hotel, marina arrival or private itinerary between Cannes, Nice and Monaco.",
    details: "The service is prepared around your exact dates, delivery point, luggage needs and preferred vehicle category. Availability, deposit, mileage and collection details are confirmed in your individual offer before booking.",
    related: ["luxury-car-rental-cannes", "luxury-car-rental-nice", "rolls-royce-rental-french-riviera"],
  },
  {
    slug: "luxury-car-rental-courchevel", kind: "car", area: "Courchevel",
    title: "Luxury Car Rental in Courchevel", eyebrow: "Courchevel winter luxury mobility",
    description: "Luxury car rental in Courchevel with premium SUVs, executive vehicles and discreet delivery for chalet and hotel stays.",
    intro: "Plan luxury car rental in Courchevel around your chalet, hotel, airport transfer or private winter itinerary, with vehicle options confirmed for your dates.",
    details: "Mountain-season requests are handled individually. We confirm live availability, delivery conditions, deposit, mileage, luggage needs and winter-route suitability before reservation.",
    related: ["mercedes-rental-courchevel", "rolls-royce-rental-courchevel", "geneva-airport-to-courchevel-transfer"],
  },
  {
    slug: "courchevel-private-transfers", kind: "car", area: "Courchevel",
    serviceType: "Private airport transfer to Courchevel",
    vehicleKeywords: ["v-class", "v class", "v 300", "traffic"],
    title: "Private Transfers to Courchevel",
    eyebrow: "Geneva, Lyon, Chambery and Turin airports",
    description: "Private luxury transfers to Courchevel from Geneva, Lyon, Chambery and Turin airports with executive vehicles and personal journey coordination.",
    intro: "Travel privately to Courchevel from Geneva, Lyon, Chambery or Turin airport. We coordinate the pickup time, passenger requirements, luggage and destination before confirming your tailored transfer.",
    details: "Executive vehicles are selected around your group and route, with Mercedes-Benz V-Class and comparable premium options subject to availability. Share your flight details, passenger count, luggage and Courchevel address to receive a clear individual quotation.",
    faq: [
      { q: "Which airports can the transfer start from?", a: "Transfers can be arranged from Geneva, Lyon, Chambery or Turin, subject to vehicle and driver availability for your date and time." },
      { q: "Is the vehicle confirmed before booking?", a: "Yes. The vehicle category, pickup plan, route and final price are confirmed in your individual offer before the transfer is booked." },
    ],
    related: ["geneva-airport-to-courchevel-transfer", "lyon-airport-to-courchevel-transfer", "mercedes-rental-french-riviera"],
  },
  {
    slug: "geneva-airport-to-courchevel-transfer", kind: "car", area: "Courchevel",
    serviceType: "Geneva airport to Courchevel private transfer",
    vehicleKeywords: ["v-class", "v class", "v 300", "traffic"],
    title: "Geneva Airport to Courchevel Transfer", eyebrow: "Private transfer from Geneva to Courchevel",
    description: "Private transfer from Geneva Airport to Courchevel with executive vehicles, luggage planning and discreet concierge coordination.",
    intro: "Arrange a private Geneva Airport to Courchevel transfer with a vehicle selected around your passengers, luggage, flight time and final chalet or hotel address.",
    details: "The journey is planned before arrival so the pickup location, timing, vehicle category and route are clear. Mercedes-Benz V-Class and comparable executive options can be proposed depending on group size and availability.",
    faq: [
      { q: "Can the transfer be arranged from Geneva Airport to Courchevel 1850?", a: "Yes. Share the flight number, passenger count, luggage and final address so the pickup and destination can be confirmed in the individual offer." },
      { q: "Can you arrange a return from Courchevel to Geneva Airport?", a: "Yes. Return transfers can be coordinated with pickup time, luggage needs and flight departure details included in the plan." },
    ],
    related: ["courchevel-private-transfers", "private-jet-to-car-transfer-courchevel", "mercedes-rental-french-riviera"],
  },
  {
    slug: "lyon-airport-to-courchevel-transfer", kind: "car", area: "Courchevel",
    serviceType: "Lyon airport to Courchevel private transfer",
    vehicleKeywords: ["v-class", "v class", "v 300", "traffic"],
    title: "Lyon Airport to Courchevel Transfer", eyebrow: "Private transfer from Lyon to Courchevel",
    description: "Private transfer from Lyon Airport to Courchevel with executive vehicles, route planning and personal concierge support.",
    intro: "Coordinate a private Lyon Airport to Courchevel transfer for ski holidays, chalet arrivals or hotel stays, with timing and vehicle category prepared around your journey.",
    details: "We confirm the pickup point, route, passenger count, luggage requirements and final Courchevel address before booking. Premium vans and executive vehicles are proposed according to live availability and group needs.",
    faq: [
      { q: "Can you handle ski luggage on a Lyon to Courchevel transfer?", a: "Yes. Tell us the passenger count and luggage volume, including ski equipment, so a suitable vehicle category can be proposed." },
      { q: "Can the route include a stop on the way to Courchevel?", a: "Yes. Planned stops can be included in the individual quote when the timing and route are confirmed." },
    ],
    related: ["courchevel-private-transfers", "geneva-airport-to-courchevel-transfer", "mercedes-rental-french-riviera"],
  },
  {
    slug: "private-jet-to-car-transfer-courchevel", kind: "car", area: "Courchevel",
    serviceType: "Private jet to car transfer in Courchevel",
    vehicleKeywords: ["v-class", "v class", "v 300", "traffic"],
    title: "Private Jet to Car Transfer in Courchevel", eyebrow: "Airport, heliport and chalet coordination",
    description: "Private jet to car transfer in Courchevel with executive vehicles, flight-aware pickup planning and discreet chalet coordination.",
    intro: "Move from private aviation to a waiting executive vehicle with a transfer plan prepared around your flight, luggage, passengers and Courchevel address.",
    details: "We coordinate airport or heliport pickup, route timing and vehicle category before the journey. Mercedes-Benz V-Class and comparable premium options can be proposed depending on group size and availability.",
    faq: [
      { q: "Can the driver coordinate with private aviation timing?", a: "Yes. Share the flight details, terminal or handler information and destination so the pickup plan can be aligned with the actual arrival." },
      { q: "Can the transfer continue directly to a chalet or hotel?", a: "Yes. The final Courchevel address, luggage needs and passenger count are included in the individual quotation." },
    ],
    related: ["geneva-airport-to-courchevel-transfer", "courchevel-private-transfers", "mercedes-rental-french-riviera"],
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
    slug: "yacht-charter-nice", kind: "yacht", area: "Nice",
    title: "Luxury Yacht Charter in Nice", eyebrow: "Private charters from Nice",
    description: "Luxury yacht charter in Nice with tailored itineraries, curated yacht options and discreet concierge coordination.",
    intro: "Plan a private yacht charter from Nice for coastal cruising, swimming stops, restaurant transfers or a bespoke Riviera day at sea.",
    details: "Tell us your dates, guest count, preferred embarkation point and onboard expectations. The final yacht selection, route and services are confirmed in a private charter proposal based on availability.",
    related: ["luxury-car-rental-nice", "yacht-charter-monaco", "yacht-charter-cannes"],
  },
  {
    slug: "yacht-charter-saint-tropez", kind: "yacht", area: "Saint-Tropez",
    title: "Luxury Yacht Charter in Saint-Tropez", eyebrow: "Saint-Tropez private yacht days",
    description: "Luxury yacht charter in Saint-Tropez with private itineraries, beach club access planning and dedicated concierge support.",
    intro: "Arrange a private yacht charter around Saint-Tropez, Pampelonne and the surrounding coastline with a yacht selected for your guests and schedule.",
    details: "Seasonal demand is high, so every request is checked against live availability. We coordinate embarkation, route ideas, onboard service expectations and return transfers before confirming the proposal.",
    related: ["luxury-car-rental-saint-tropez", "yacht-charter-cannes", "lamborghini-rental-french-riviera"],
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
    slug: "lamborghini-rental-courchevel", kind: "car", brand: "Lamborghini", area: "Courchevel",
    title: "Lamborghini Rental in Courchevel", eyebrow: "Lamborghini winter concierge rental",
    description: "Lamborghini rental in Courchevel with private delivery coordination, live availability checks and concierge support.",
    intro: "Request a Lamborghini for a Courchevel stay, chalet arrival or mountain itinerary, with delivery and collection planned around your dates.",
    details: "Every Lamborghini request is checked against live fleet availability before confirmation. Deposit, mileage, insurance conditions, winter suitability and delivery details are presented in the individual offer.",
    related: ["luxury-car-rental-courchevel", "geneva-airport-to-courchevel-transfer", "ferrari-rental-courchevel"],
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
    slug: "mercedes-rental-courchevel", kind: "car", brand: "Mercedes", area: "Courchevel",
    title: "Mercedes-Benz Rental in Courchevel", eyebrow: "Mercedes-Benz and V-Class Courchevel",
    description: "Mercedes-Benz rental in Courchevel for private transfers, chalet stays and winter mobility with concierge coordination.",
    intro: "Arrange Mercedes-Benz comfort for Courchevel, from V-Class transfer planning to premium SUVs and executive models selected around your trip.",
    details: "We confirm the exact model category, pickup plan, luggage requirements and delivery conditions before booking. Mercedes-Benz options are especially useful for Geneva, Lyon and private airport transfers to Courchevel.",
    related: ["courchevel-private-transfers", "geneva-airport-to-courchevel-transfer", "lyon-airport-to-courchevel-transfer"],
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
    slug: "ferrari-rental-courchevel", kind: "car", brand: "Ferrari", area: "Courchevel",
    title: "Ferrari Rental in Courchevel", eyebrow: "Ferrari concierge rental Courchevel",
    description: "Ferrari rental in Courchevel with availability checked individually and delivery coordinated for premium winter stays.",
    intro: "Request a Ferrari for a Courchevel itinerary, special arrival or private stay, with the proposal prepared around live availability and conditions.",
    details: "Because mountain-season availability and vehicle suitability can vary, every Ferrari request is confirmed individually. The offer includes rental terms, delivery details, deposit, mileage and collection planning.",
    related: ["lamborghini-rental-courchevel", "luxury-car-rental-courchevel", "private-jet-to-car-transfer-courchevel"],
  },
  {
    slug: "rolls-royce-rental-french-riviera", kind: "car", brand: "Rolls-Royce",
    title: "Rolls-Royce Rental on the French Riviera", eyebrow: "Rolls-Royce private rental",
    description: "Rolls-Royce rental on the French Riviera with discreet delivery for stays, events and private travel in Cannes and Monaco.",
    intro: "Arrange a Rolls-Royce for refined private travel, a special event or an important arrival, supported by a dedicated concierge.",
    details: "Available models and rental terms are confirmed for each request. We coordinate the chosen delivery location and timing while keeping the service personal and discreet.",
    related: ["mercedes-rental-french-riviera", "luxury-car-rental-cannes", "luxury-car-rental-monaco"],
  },
  {
    slug: "rolls-royce-rental-courchevel", kind: "car", brand: "Rolls-Royce", area: "Courchevel",
    title: "Rolls-Royce Rental in Courchevel", eyebrow: "Rolls-Royce winter arrival service",
    description: "Rolls-Royce rental in Courchevel for discreet chalet arrivals, hotel stays and private winter mobility.",
    intro: "Arrange a Rolls-Royce or comparable ultra-luxury vehicle for Courchevel with a concierge handling timing, delivery and conditions.",
    details: "Availability is checked for your exact dates before confirmation. The individual offer details the model, delivery point, deposit, mileage, insurance conditions and any route limitations.",
    related: ["bentley-rental-courchevel", "mercedes-rental-courchevel", "geneva-airport-to-courchevel-transfer"],
  },
  {
    slug: "bentley-rental-courchevel", kind: "car", brand: "Bentley", area: "Courchevel",
    title: "Bentley Rental in Courchevel", eyebrow: "Bentley and comparable luxury SUVs",
    description: "Bentley rental in Courchevel or comparable luxury SUV options for chalet stays, transfers and private winter travel.",
    intro: "Request a Bentley or comparable luxury SUV for Courchevel, with vehicle options proposed according to live availability and your route.",
    details: "The concierge confirms whether a Bentley or suitable comparable model is available for your dates. The proposal includes delivery, collection, deposit, mileage and winter-route conditions before booking.",
    faq: [
      { q: "Is a Bentley always available in Courchevel?", a: "Availability is confirmed individually for your dates. If a Bentley is unavailable, a comparable ultra-luxury SUV can be proposed." },
      { q: "Can the car be delivered to a chalet or hotel?", a: "Yes. The delivery address, timing and collection point are confirmed in the private offer." },
    ],
    related: ["rolls-royce-rental-courchevel", "mercedes-rental-courchevel", "courchevel-private-transfers"],
  },
];

const COURCHEVEL_CLUSTER_SLUGS = [
  "luxury-car-rental-courchevel",
  "courchevel-private-transfers",
  "geneva-airport-to-courchevel-transfer",
  "lyon-airport-to-courchevel-transfer",
  "private-jet-to-car-transfer-courchevel",
  "mercedes-rental-courchevel",
  "rolls-royce-rental-courchevel",
  "bentley-rental-courchevel",
  "lamborghini-rental-courchevel",
  "ferrari-rental-courchevel",
];

const UI: Record<LangCode, Record<string, string>> = {
  en: { collection: "Relevant vehicles", process: "A service built around your plans", step1: "Share your dates, destination and preferences.", step2: "Receive a tailored selection with confirmed availability.", step3: "Approve the offer and coordinate delivery or embarkation.", view: "View details", catalog: "Explore the full collection", request: "Request a private offer", faq: "Frequently asked questions", q1: "Is availability guaranteed?", a1: "Availability is confirmed personally for your exact dates before any booking is finalised.", q2: "Can delivery or embarkation be arranged?", a2: "Yes. The precise location, time and any related charge are stated in your individual offer.", related: "Related services", cluster: "Courchevel service cluster", clusterIntro: "Compare the connected Courchevel pages for airport transfers, private aviation arrivals and prestige vehicle requests." },
  fr: { collection: "Sélection pertinente", process: "Un service adapté à votre programme", step1: "Indiquez vos dates, votre destination et vos préférences.", step2: "Recevez une sélection personnalisée avec disponibilité confirmée.", step3: "Validez l’offre et organisez la livraison ou l’embarquement.", view: "Voir les détails", catalog: "Voir toute la collection", request: "Demander une offre privée", faq: "Questions fréquentes", q1: "La disponibilité est-elle garantie ?", a1: "La disponibilité est confirmée personnellement pour vos dates avant la réservation.", q2: "La livraison ou l’embarquement sont-ils possibles ?", a2: "Oui. Le lieu, l’heure et les éventuels frais figurent dans votre offre individuelle.", related: "Services associés", cluster: "Services Courchevel associés", clusterIntro: "Comparez les pages Courchevel liées aux transferts aéroport, arrivées privées et demandes de véhicules prestige." },
  ru: { collection: "Подходящие варианты", process: "Сервис под ваш маршрут", step1: "Сообщите даты, направление и пожелания.", step2: "Получите персональную подборку с подтверждённой доступностью.", step3: "Подтвердите предложение и согласуйте доставку или посадку.", view: "Подробнее", catalog: "Смотреть весь каталог", request: "Запросить персональное предложение", faq: "Частые вопросы", q1: "Доступность гарантирована?", a1: "Мы лично подтверждаем доступность на ваши даты до окончательного бронирования.", q2: "Можно организовать доставку или посадку?", a2: "Да. Точное место, время и возможная стоимость указываются в индивидуальном предложении.", related: "Похожие услуги", cluster: "Связанные услуги Courchevel", clusterIntro: "Сравните связанные страницы Courchevel: трансферы из аэропорта, private aviation и запросы на престижные автомобили." },
  ro: { collection: "Opțiuni relevante", process: "Un serviciu adaptat planului dvs.", step1: "Comunicați datele, destinația și preferințele.", step2: "Primiți o selecție personalizată cu disponibilitate confirmată.", step3: "Aprobați oferta și coordonați livrarea sau îmbarcarea.", view: "Detalii", catalog: "Vedeți întreaga colecție", request: "Solicitați o ofertă privată", faq: "Întrebări frecvente", q1: "Disponibilitatea este garantată?", a1: "Disponibilitatea este confirmată personal pentru datele dvs. înainte de rezervare.", q2: "Se poate organiza livrarea sau îmbarcarea?", a2: "Da. Locul, ora și eventualele costuri apar în oferta individuală.", related: "Servicii conexe", cluster: "Servicii Courchevel conexe", clusterIntro: "Comparați paginile Courchevel pentru transferuri de aeroport, sosiri cu aviație privată și cereri de vehicule premium." },
  ar: { collection: "خيارات مناسبة", process: "خدمة مصممة وفق خطتكم", step1: "أرسلوا التواريخ والوجهة والتفضيلات.", step2: "احصلوا على مجموعة مخصصة مع تأكيد التوفر.", step3: "وافقوا على العرض ونسقوا التسليم أو الصعود.", view: "عرض التفاصيل", catalog: "استكشف المجموعة كاملة", request: "اطلب عرضاً خاصاً", faq: "الأسئلة الشائعة", q1: "هل التوفر مضمون؟", a1: "يتم تأكيد التوفر شخصياً لتواريخكم قبل إتمام الحجز.", q2: "هل يمكن ترتيب التسليم أو الصعود؟", a2: "نعم. يوضح العرض الفردي المكان والوقت وأي تكلفة مرتبطة.", related: "خدمات ذات صلة", cluster: "خدمات كورشوفيل المرتبطة", clusterIntro: "قارنوا صفحات كورشوفيل الخاصة بالنقل من المطارات، والوصول بالطيران الخاص، وطلبات السيارات الفاخرة." },
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
        { "@context": "https://schema.org", "@type": "Service", name: page.title, description: page.description, serviceType: page.serviceType || (page.kind === "yacht" ? "Luxury yacht charter" : "Luxury car rental"), areaServed: page.area ? { "@type": "City", name: page.area } : "French Riviera", provider: { "@id": `${SITE_URL}/#organization` }, url: `${SITE_URL}${path}/?lang=${lang}` },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/?lang=${lang}` }, { "@type": "ListItem", position: 2, name: page.kind === "yacht" ? "Yachts" : "Cars", item: `${SITE_URL}/${page.kind === "yacht" ? "yachts" : "cars"}/?lang=${lang}` }, { "@type": "ListItem", position: 3, name: page.title }] },
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
                      href={`${vehiclePath(vehicle)}/?lang=${lang}`}
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

          <section className="mt-20 grid gap-10 border-y border-white/10 py-12 md:grid-cols-2"><div><h2 className="mb-5 font-serif text-2xl sm:text-3xl">{text.faq}</h2>{faq.map((item) => <div key={item.q} className="mb-6"><h3 className="mb-2 text-sm font-medium text-gold">{item.q}</h3><p className="font-light leading-7 text-white/55">{item.a}</p></div>)}</div><div><h2 className="mb-5 font-serif text-2xl sm:text-3xl">{text.related}</h2><div className="space-y-3">{page.related.map((relatedSlug) => { const related = LANDINGS.find((item) => item.slug === relatedSlug)!; return <a key={relatedSlug} href={`/services/${relatedSlug}/?lang=${lang}`} className="flex items-center justify-between border-b border-white/10 py-3 text-white/70 transition hover:text-gold"><span>{related.title}</span><ChevronRight size={16} /></a>; })}</div></div></section>

          {clusterLinks.length > 0 && (
            <section className="mt-14 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <div className="mb-6 max-w-3xl">
                <h2 className="font-serif text-2xl sm:text-3xl">{text.cluster}</h2>
                <p className="mt-3 font-light leading-7 text-white/50">{text.clusterIntro}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clusterLinks.map((clusterPage) => (
                  <a key={clusterPage.slug} href={`/services/${clusterPage.slug}/?lang=${lang}`} className="flex min-h-20 items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65 transition hover:border-gold/40 hover:text-gold">
                    <span>{clusterPage.title}</span>
                    <ChevronRight size={16} className="shrink-0" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="mt-14 rounded-xl border border-gold/20 bg-gold/[0.04] p-8 md:flex md:items-center md:justify-between md:p-10"><div><h2 className="font-serif text-2xl sm:text-3xl">{text.request}</h2><p className="mt-3 text-sm text-white/50">{text.process}</p></div><div className="mt-7 flex flex-wrap gap-3 md:mt-0"><a href={`/${page.kind === "yacht" ? "yachts" : "cars"}/?lang=${lang}`} className="rounded border border-white/20 px-5 py-3 text-xs uppercase tracking-wider">{text.catalog}</a><a href={`/?lang=${lang}#request`} className="rounded bg-gold px-5 py-3 text-xs uppercase tracking-wider text-black">{text.request}</a></div></section>
        </article>
      </main>
    </div>
  );
}
