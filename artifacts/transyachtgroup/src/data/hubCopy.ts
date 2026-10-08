import type { LangCode } from "@/contexts/LanguageContext";

/** Copy of the guides and news hub pages. Pure data shared with the build-time prerender. */
export const GUIDES_COPY: Record<LangCode, { title: string; intro: string; loading: string; empty: string; guide: string; read: string }> = {
  en: { title: "French Riviera Luxury Travel Guides", intro: "Practical local insight for private car rental, yacht charter and exceptional journeys across the Côte d’Azur.", loading: "Loading guides…", empty: "New guides are being prepared.", guide: "Guide", read: "Read guide" },
  fr: { title: "Guides de voyage de luxe sur la Côte d’Azur", intro: "Conseils locaux pour la location de voitures de prestige, le charter de yachts et des voyages d’exception sur la Côte d’Azur.", loading: "Chargement des guides…", empty: "De nouveaux guides sont en préparation.", guide: "Guide", read: "Lire le guide" },
  ru: { title: "Гайды по премиальному отдыху на Лазурном Берегу", intro: "Практические рекомендации по аренде премиальных автомобилей, яхт и организации исключительных путешествий по Лазурному Берегу.", loading: "Загрузка гайдов…", empty: "Новые гайды готовятся к публикации.", guide: "Гайд", read: "Читать гайд" },
  ro: { title: "Ghiduri de călătorie de lux pe Riviera Franceză", intro: "Recomandări locale pentru închirieri auto premium, charter de iahturi și călătorii excepționale pe Coasta de Azur.", loading: "Se încarcă ghidurile…", empty: "Pregătim ghiduri noi.", guide: "Ghid", read: "Citiți ghidul" },
  ar: { title: "أدلة السفر الفاخر في الريفييرا الفرنسية", intro: "نصائح محلية عملية لتأجير السيارات الفاخرة واستئجار اليخوت والرحلات الاستثنائية على الريفييرا الفرنسية.", loading: "جارٍ تحميل الأدلة…", empty: "يجري إعداد أدلة جديدة.", guide: "دليل", read: "قراءة الدليل" },
};

export const NEWS_COPY: Record<LangCode, { title: string; intro: string; loading: string; empty: string; read: string }> = {
  en: { title: "News from Trans Yacht Group", intro: "Latest updates on luxury cars, VIP transfers and premium mobility across Monaco, the French Riviera and Courchevel.", loading: "Loading news…", empty: "News articles are being prepared.", read: "Read news" },
  fr: { title: "Actualités de Trans Yacht Group", intro: "Dernières nouvelles sur les voitures de luxe, les transferts VIP et la mobilité premium à Monaco, sur la Côte d’Azur et à Courchevel.", loading: "Chargement des actualités…", empty: "Les actualités sont en préparation.", read: "Lire l’actualité" },
  ru: { title: "Новости Trans Yacht Group", intro: "Свежие новости о премиальных автомобилях, VIP-трансферах, Монако, Лазурном Береге и Куршавеле.", loading: "Загрузка новостей…", empty: "Новости готовятся к публикации.", read: "Читать новость" },
  ro: { title: "Noutăți Trans Yacht Group", intro: "Actualizări despre mașini de lux, transferuri VIP și mobilitate premium în Monaco, Riviera Franceză și Courchevel.", loading: "Se încarcă noutățile…", empty: "Pregătim articole noi.", read: "Citiți știrea" },
  ar: { title: "أخبار ترانس يخت غروب", intro: "آخر الأخبار حول السيارات الفاخرة والتنقل الخاص في موناكو والريفييرا الفرنسية وكورشوفيل.", loading: "جارٍ تحميل الأخبار…", empty: "يجري إعداد الأخبار.", read: "قراءة الخبر" },
};

