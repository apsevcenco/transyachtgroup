import type { LangCode } from "@/contexts/LanguageContext";

/** Suffix of the <title> of vehicle detail pages ("Ferrari 296 GTB Luxury Car Rental"). */
export const VEHICLE_TITLE_SUFFIX: Record<LangCode, { car: string; yacht: string }> = {
  en: { car: "Luxury Car Rental", yacht: "Yacht Charter" },
  fr: { car: "Location de voiture de luxe", yacht: "Location de yacht" },
  ru: { car: "Аренда премиального автомобиля", yacht: "Аренда яхты" },
  ro: { car: "Închiriere auto de lux", yacht: "Charter de iaht" },
  ar: { car: "تأجير سيارة فاخرة", yacht: "تأجير يخت" },
};

export type PageLabels = {
  home: string;
  cars: string;
  yachts: string;
  about: string;
  guides: string;
  news: string;
  allCars: string;
  allYachts: string;
  allGuides: string;
  allNews: string;
  fleet: string;
  fleetYachts: string;
  relatedServices: string;
  destinations: string;
  services: string;
  specifications: string;
  requestOffer: string;
  explore: string;
  servicesIn: (city: string) => string;
  specs: Record<string, string>;
};

/** Labels of the build-time prerendered body text (the React app has its own t() dictionary). */
export const PAGE_LABELS: Record<LangCode, PageLabels> = {
  en: {
    home: "Home", cars: "Luxury cars", yachts: "Yacht charter", about: "About Trans Yacht Group", guides: "Guides", news: "News",
    allCars: "All cars", allYachts: "All yachts", allGuides: "All guides", allNews: "All news",
    fleet: "Our fleet", fleetYachts: "Our yachts", relatedServices: "Related services", destinations: "Destinations", services: "Services",
    specifications: "Specifications", requestOffer: "Request a private offer", explore: "Explore",
    servicesIn: (city) => `${city} services`,
    specs: { builder: "Builder", year: "Year", engine: "Engine", power: "Power", topSpeed: "Top speed", acceleration: "0-100 km/h", seats: "Seats", doors: "Doors", transmission: "Transmission", drive: "Drive", length: "Length", beam: "Beam", draft: "Draft", cabins: "Cabins", guests: "Guests", crew: "Crew", cruisingSpeed: "Cruising speed", maxSpeed: "Max speed" },
  },
  fr: {
    home: "Accueil", cars: "Voitures de luxe", yachts: "Location de yachts", about: "À propos de Trans Yacht Group", guides: "Guides", news: "Actualités",
    allCars: "Toutes les voitures", allYachts: "Tous les yachts", allGuides: "Tous les guides", allNews: "Toutes les actualités",
    fleet: "Notre flotte", fleetYachts: "Nos yachts", relatedServices: "Services associés", destinations: "Destinations", services: "Services",
    specifications: "Spécifications", requestOffer: "Demander une offre privée", explore: "À découvrir",
    servicesIn: (city) => `Services à ${city}`,
    specs: { builder: "Constructeur / Chantier", year: "Année", engine: "Moteur", power: "Puissance (CV)", topSpeed: "Vitesse max", acceleration: "0–100 km/h", seats: "Places", transmission: "Transmission", drive: "Transmission", length: "Longueur", beam: "Largeur", draft: "Tirant d’eau", cabins: "Cabines", guests: "Invités max", crew: "Équipage", cruisingSpeed: "Vitesse de croisière", maxSpeed: "Vitesse max" },
  },
  ru: {
    home: "Главная", cars: "Автомобили премиум-класса", yachts: "Аренда яхт", about: "О компании Trans Yacht Group", guides: "Гайды", news: "Новости",
    allCars: "Все автомобили", allYachts: "Все яхты", allGuides: "Все гайды", allNews: "Все новости",
    fleet: "Наш автопарк", fleetYachts: "Наши яхты", relatedServices: "Похожие услуги", destinations: "Направления", services: "Услуги",
    specifications: "Характеристики", requestOffer: "Запросить персональное предложение", explore: "Смотрите также",
    servicesIn: (city) => `Услуги: ${city}`,
    specs: { builder: "Верфь / Строитель", year: "Год", engine: "Двигатель", power: "Мощность (л.с.)", topSpeed: "Макс. скорость", acceleration: "0–100 км/ч", seats: "Места", transmission: "Трансмиссия", drive: "Привод", length: "Длина", beam: "Ширина", draft: "Осадка", cabins: "Каюты", guests: "Макс. гостей", crew: "Экипаж", cruisingSpeed: "Крейсерская скорость", maxSpeed: "Макс. скорость" },
  },
  ro: {
    home: "Acasă", cars: "Automobile de lux", yachts: "Charter de iahturi", about: "Despre Trans Yacht Group", guides: "Ghiduri", news: "Noutăți",
    allCars: "Toate mașinile", allYachts: "Toate iahturile", allGuides: "Toate ghidurile", allNews: "Toate noutățile",
    fleet: "Flota noastră", fleetYachts: "Iahturile noastre", relatedServices: "Servicii conexe", destinations: "Destinații", services: "Servicii",
    specifications: "Specificații", requestOffer: "Solicitați o ofertă privată", explore: "De explorat",
    servicesIn: (city) => `Servicii în ${city}`,
    specs: { builder: "Constructor / Șantier", year: "An", engine: "Motor", power: "Putere (CP)", topSpeed: "Viteză maximă", acceleration: "0–100 km/h", seats: "Locuri", transmission: "Transmisie", drive: "Tracțiune", length: "Lungime", beam: "Lățime", draft: "Pescaj", cabins: "Cabine", guests: "Oaspeți max", crew: "Echipaj", cruisingSpeed: "Viteză de croazieră", maxSpeed: "Viteză maximă" },
  },
  ar: {
    home: "الرئيسية", cars: "سيارات فاخرة", yachts: "تأجير اليخوت", about: "حول Trans Yacht Group", guides: "أدلة", news: "أخبار",
    allCars: "جميع السيارات", allYachts: "جميع اليخوت", allGuides: "جميع الأدلة", allNews: "جميع الأخبار",
    fleet: "أسطولنا", fleetYachts: "يخوتنا", relatedServices: "خدمات ذات صلة", destinations: "الوجهات", services: "الخدمات",
    specifications: "المواصفات", requestOffer: "اطلب عرضاً خاصاً", explore: "اكتشف المزيد",
    servicesIn: (city) => `خدمات ${city}`,
    specs: { builder: "الشركة المصنعة", year: "السنة", engine: "المحرك", power: "القوة (حصان)", topSpeed: "السرعة القصوى", acceleration: "0–100 كم/س", seats: "المقاعد", transmission: "ناقل الحركة", drive: "نظام الدفع", length: "الطول", beam: "العرض", draft: "الغاطس", cabins: "الكبائن", guests: "أقصى عدد ضيوف", crew: "الطاقم", cruisingSpeed: "سرعة الإبحار", maxSpeed: "السرعة القصوى" },
  },
};

/** Heading of the related-answers block (links point at the English-only answers). */
export const RELATED_QUESTIONS: Record<LangCode, string> = {
  en: "Related questions",
  fr: "Questions associées",
  ru: "Связанные вопросы",
  ro: "Întrebări conexe",
  ar: "أسئلة ذات صلة",
};
