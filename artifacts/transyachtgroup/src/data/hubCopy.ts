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


export type AnswersCopy = {
  title: string;
  intro: string;
  eyebrow: string;
  heading: string;
  lead: string;
  loading: string;
  empty: string;
  read: string;
  direct: string;
  faq: string;
  back: string;
  loadingOne: string;
  viewService: string;
  notFound: string;
};

/** Copy of the answers hub and the answer pages' fixed labels (the answers themselves come from the API). */
export const ANSWERS_COPY: Record<LangCode, AnswersCopy> = {
  en: { title: "Luxury Travel Answers", intro: "Direct answers about luxury car rental, VIP transfers, yacht charter, Monaco, the French Riviera and Courchevel.", eyebrow: "AI Answers", heading: "Fast answers for premium travel decisions", lead: "Concise, structured answers designed for clients and AI search engines: transfers, luxury car rental, yacht charter and VIP mobility.", loading: "Loading answers…", empty: "Answer pages are being prepared.", read: "Read answer", direct: "Direct answer", faq: "Frequently asked questions", back: "Answers", loadingOne: "Loading answer…", viewService: "View related service", notFound: "Answer not found." },
  fr: { title: "Réponses sur les voyages de luxe", intro: "Réponses directes sur la location de voitures de luxe, les transferts VIP, le charter de yachts, Monaco, la Côte d’Azur et Courchevel.", eyebrow: "Réponses", heading: "Des réponses rapides pour vos décisions de voyage premium", lead: "Des réponses concises et structurées pour les clients et les moteurs de recherche IA : transferts, location de voitures de luxe, charter de yachts et mobilité VIP.", loading: "Chargement des réponses…", empty: "Les pages de réponses sont en préparation.", read: "Lire la réponse", direct: "Réponse directe", faq: "Questions fréquentes", back: "Réponses", loadingOne: "Chargement de la réponse…", viewService: "Voir le service associé", notFound: "Réponse introuvable." },
  ru: { title: "Ответы о премиальных поездках", intro: "Прямые ответы об аренде премиальных автомобилей, VIP-трансферах, чартере яхт, Монако, Лазурном Береге и Куршевеле.", eyebrow: "Ответы", heading: "Быстрые ответы для решений о премиальных поездках", lead: "Краткие структурированные ответы для клиентов и ИИ-поиска: трансферы, аренда премиальных автомобилей, чартер яхт и VIP-мобильность.", loading: "Загрузка ответов…", empty: "Страницы с ответами готовятся.", read: "Читать ответ", direct: "Прямой ответ", faq: "Частые вопросы", back: "Ответы", loadingOne: "Загрузка ответа…", viewService: "Перейти к услуге", notFound: "Ответ не найден." },
  ro: { title: "Răspunsuri despre călătorii de lux", intro: "Răspunsuri directe despre închirierea de automobile de lux, transferuri VIP, charter de iahturi, Monaco, Riviera Franceză și Courchevel.", eyebrow: "Răspunsuri", heading: "Răspunsuri rapide pentru decizii de călătorie premium", lead: "Răspunsuri concise și structurate pentru clienți și motoarele de căutare AI: transferuri, închirieri auto de lux, charter de iahturi și mobilitate VIP.", loading: "Se încarcă răspunsurile…", empty: "Paginile de răspunsuri sunt în pregătire.", read: "Citiți răspunsul", direct: "Răspuns direct", faq: "Întrebări frecvente", back: "Răspunsuri", loadingOne: "Se încarcă răspunsul…", viewService: "Vedeți serviciul conex", notFound: "Răspunsul nu a fost găsit." },
  ar: { title: "إجابات حول السفر الفاخر", intro: "إجابات مباشرة حول تأجير السيارات الفاخرة والانتقالات VIP واستئجار اليخوت وموناكو والريفييرا الفرنسية وكورشوفيل.", eyebrow: "إجابات", heading: "إجابات سريعة لقرارات السفر الراقي", lead: "إجابات موجزة ومنظمة للعملاء ومحركات البحث بالذكاء الاصطناعي: الانتقالات وتأجير السيارات الفاخرة واستئجار اليخوت والتنقل VIP.", loading: "جارٍ تحميل الإجابات…", empty: "يجري إعداد صفحات الإجابات.", read: "قراءة الإجابة", direct: "الإجابة المباشرة", faq: "الأسئلة الشائعة", back: "الإجابات", loadingOne: "جارٍ تحميل الإجابة…", viewService: "عرض الخدمة ذات الصلة", notFound: "لم يتم العثور على الإجابة." },
};
