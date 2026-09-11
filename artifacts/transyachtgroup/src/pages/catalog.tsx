import { useState, useEffect, useCallback } from "react";
import { motion } from "@/lib/motion-shim";
import {
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  RefreshCw,
  Phone,
  MessageCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useLocation } from "wouter";
import { fetchVehicles, fetchContent } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageView } from "@/hooks/useAnalytics";
import { CmsContent } from "@/components/CmsContent";
import { vehiclePath } from "@/lib/vehicleSeo";

const ALL_CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
];

type Rates = Record<string, number>;

function formatPrice(amount: number, currency: string): string {
  const curr = ALL_CURRENCIES.find((c) => c.code === currency);
  const symbol = curr?.symbol || currency;
  const formatted = Math.round(amount).toLocaleString("en-US");

  if (currency === "JPY" || currency === "CNY") {
    return `${symbol}${formatted}`;
  }

  return `${symbol} ${formatted}`;
}

function getFontSize(value?: string | null, fallback = "48px") {
  if (!value) return fallback;
  const clean = String(value).trim();
  return /^\d+$/.test(clean) ? `${clean}px` : clean;
}

interface CatalogProps {
  category: "yacht" | "car";
}

const SEO_SECTIONS = {
  car: {
    en: [
      {
        title: "Luxury car rental in Cannes, Monaco and the French Riviera",
        body: "Trans Yacht Group arranges private luxury car rental across Cannes, Monaco, Nice, Saint-Tropez, Antibes and Courchevel for clients who expect discretion, comfort and precise timing. The service is designed for hotel stays, villa arrivals, yacht connections, business meetings, private aviation transfers and events on the Côte d’Azur.",
      },
      {
        title: "Supercars, executive cars and chauffeur options",
        body: "The fleet may include supercars, luxury SUVs, Mercedes-Benz models, Rolls-Royce, Ferrari, Lamborghini and other premium vehicles depending on availability. Each request is handled individually: we confirm dates, route, delivery address, driver requirements, luggage needs and the level of privacy expected before proposing the most suitable car.",
      },
      {
        title: "VIP delivery, airport transfers and concierge coordination",
        body: "Vehicles can be coordinated for Nice Côte d’Azur Airport, Cannes, Monaco, private terminals, hotels, villas, ports and winter transfers to Courchevel. Clients can request self-drive rental, chauffeur service, airport meet-and-greet, yacht-to-car transfers or a complete mobility plan for several days.",
      },
    ],
    fr: [
      {
        title: "Location de voitures de luxe à Cannes, Monaco et sur la Côte d’Azur",
        body: "Trans Yacht Group organise la location privée de voitures de luxe à Cannes, Monaco, Nice, Saint-Tropez, Antibes et Courchevel pour une clientèle qui recherche discrétion, confort et ponctualité. Le service convient aux hôtels, villas, événements, arrivées en jet privé, rendez-vous d’affaires et connexions avec yacht.",
      },
      {
        title: "Supercars, voitures avec chauffeur et modèles exécutifs",
        body: "La flotte peut inclure des supercars, SUV de luxe, Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini et d’autres véhicules premium selon disponibilité. Chaque demande est préparée sur mesure selon les dates, le trajet, l’adresse de livraison, le besoin de chauffeur, les bagages et le niveau de confidentialité attendu.",
      },
      {
        title: "Livraison VIP, transferts aéroport et conciergerie",
        body: "Les véhicules peuvent être livrés à l’aéroport de Nice Côte d’Azur, Cannes, Monaco, aux terminaux privés, hôtels, villas, ports et pour les transferts vers Courchevel. Le client peut demander une location sans chauffeur, un chauffeur privé, un accueil aéroport ou un itinéraire complet de mobilité.",
      },
    ],
    ru: [
      {
        title: "Аренда люксовых автомобилей в Каннах, Монако и на Лазурном Берегу",
        body: "Trans Yacht Group организует частную аренду премиальных автомобилей в Каннах, Монако, Ницце, Сен-Тропе, Антибе и Куршевеле для клиентов, которым важны приватность, комфорт и точная логистика. Сервис подходит для отелей, вилл, мероприятий, бизнес-встреч, частной авиации и пересадок с яхты в автомобиль.",
      },
      {
        title: "Суперкары, представительские автомобили и водитель",
        body: "В автопарке могут быть суперкары, люксовые SUV, Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini и другие премиальные модели в зависимости от доступности. Каждая заявка готовится индивидуально: даты, маршрут, адрес доставки, водитель, багаж и требования к приватности уточняются до подбора автомобиля.",
      },
      {
        title: "VIP-доставка, аэропорты и консьерж-сопровождение",
        body: "Автомобили можно организовать для аэропорта Nice Côte d’Azur, Канн, Монако, частных терминалов, отелей, вилл, портов и трансферов в Куршевель. Возможны аренда без водителя, chauffeur service, встреча в аэропорту, пересадка yacht-to-car и полный план передвижения на несколько дней.",
      },
    ],
    ro: [
      {
        title: "Închirieri auto de lux în Cannes, Monaco și pe Riviera Franceză",
        body: "Trans Yacht Group organizează închirieri private de automobile de lux în Cannes, Monaco, Nisa, Saint-Tropez, Antibes și Courchevel pentru clienți care cer discreție, confort și logistică precisă. Serviciul este potrivit pentru hoteluri, vile, evenimente, aviație privată, întâlniri de afaceri și conexiuni cu iahturi.",
      },
      {
        title: "Supercaruri, automobile executive și opțiuni cu șofer",
        body: "Flota poate include supercaruri, SUV-uri de lux, Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini și alte modele premium, în funcție de disponibilitate. Fiecare solicitare este pregătită individual, în funcție de date, traseu, adresă de livrare, șofer, bagaje și nivelul de confidențialitate.",
      },
      {
        title: "Livrare VIP, transferuri aeroport și concierge",
        body: "Automobilele pot fi coordonate pentru aeroportul Nice Côte d’Azur, Cannes, Monaco, terminale private, hoteluri, vile, porturi și transferuri către Courchevel. Clienții pot solicita self-drive, șofer privat, întâmpinare la aeroport sau un plan complet de mobilitate.",
      },
    ],
    ar: [
      {
        title: "تأجير سيارات فاخرة في كان وموناكو والريفييرا الفرنسية",
        body: "تنظم Trans Yacht Group تأجير السيارات الفاخرة الخاصة في كان وموناكو ونيس وسان تروبيه وأنتيب وكورشوفيل للعملاء الذين يبحثون عن الخصوصية والراحة والدقة في التنقل. تناسب الخدمة الفنادق والفلل والفعاليات والطيران الخاص والاجتماعات والانتقال بين اليخوت والسيارات.",
      },
      {
        title: "سيارات سوبركار وسيارات تنفيذية وخدمة سائق",
        body: "يمكن أن تشمل المجموعة سيارات سوبركار وسيارات SUV فاخرة وMercedes-Benz وRolls-Royce وFerrari وLamborghini وغيرها من السيارات الراقية حسب التوفر. تتم دراسة كل طلب حسب التاريخ والمسار وموقع التسليم والحاجة إلى سائق والأمتعة ومستوى الخصوصية.",
      },
      {
        title: "تسليم VIP وانتقالات المطار وخدمة الكونسيرج",
        body: "يمكن تنسيق السيارات لمطار نيس كوت دازور وكان وموناكو والمحطات الخاصة والفنادق والفلل والموانئ والانتقالات إلى كورشوفيل. يمكن طلب قيادة ذاتية أو سائق خاص أو استقبال في المطار أو خطة تنقل كاملة لعدة أيام.",
      },
    ],
  },
  yacht: {
    en: [
      {
        title: "Luxury yacht charter in Cannes, Monaco and Saint-Tropez",
        body: "Trans Yacht Group coordinates private yacht charters across the French Riviera, including Cannes, Monaco, Nice, Antibes and Saint-Tropez. The service is built for clients who need a curated yacht selection, discreet communication, flexible embarkation and concierge support before and during the charter.",
      },
      {
        title: "Private day charters, events and bespoke itineraries",
        body: "A yacht request can be prepared for a day at sea, a private celebration, a corporate event, a Monaco Grand Prix stay, Cannes Film Festival logistics or a coastal itinerary with restaurant and beach club stops. The team reviews dates, guest count, preferred style, route, crew expectations and onboard service requirements.",
      },
      {
        title: "Yacht-to-car transfers and complete Riviera mobility",
        body: "For clients arriving by jet, staying in a villa or moving between ports, yacht charter can be coordinated together with luxury car rental, chauffeur service and VIP transfers. This creates one private mobility plan from airport arrival to hotel, yacht embarkation and evening return.",
      },
    ],
    fr: [
      {
        title: "Location de yachts de luxe à Cannes, Monaco et Saint-Tropez",
        body: "Trans Yacht Group coordonne des charters privés de yachts sur la Côte d’Azur, notamment à Cannes, Monaco, Nice, Antibes et Saint-Tropez. Le service est conçu pour les clients qui recherchent une sélection de yachts adaptée, une communication discrète, un embarquement flexible et une conciergerie dédiée.",
      },
      {
        title: "Charters privés, événements et itinéraires sur mesure",
        body: "Une demande de yacht peut être organisée pour une journée en mer, une célébration privée, un événement corporate, le Grand Prix de Monaco, le Festival de Cannes ou un itinéraire côtier avec restaurants et beach clubs. L’équipe vérifie les dates, le nombre d’invités, le style souhaité, la route et le service à bord.",
      },
      {
        title: "Transferts yacht-to-car et mobilité complète",
        body: "Pour les clients arrivant en jet privé, séjournant en villa ou se déplaçant entre plusieurs ports, le yacht charter peut être coordonné avec la location de voiture de luxe, chauffeur privé et transferts VIP. L’objectif est un itinéraire fluide de l’aéroport au yacht puis au retour du soir.",
      },
    ],
    ru: [
      {
        title: "Аренда яхт в Каннах, Монако и Сен-Тропе",
        body: "Trans Yacht Group организует частный yacht charter на Лазурном Берегу, включая Канны, Монако, Ниццу, Антиб и Сен-Тропе. Сервис рассчитан на клиентов, которым нужна точная подборка яхты, приватная коммуникация, гибкая посадка и консьерж-сопровождение до и во время выхода в море.",
      },
      {
        title: "Частные чартеры, мероприятия и маршруты",
        body: "Яхту можно подготовить для дня в море, частного праздника, корпоративного события, Monaco Grand Prix, Cannes Film Festival или маршрута по побережью с ресторанами и beach clubs. Команда уточняет даты, количество гостей, стиль яхты, маршрут, требования к экипажу и сервису на борту.",
      },
      {
        title: "Пересадка yacht-to-car и полная мобильность",
        body: "Для клиентов, прилетающих частным рейсом, живущих на вилле или перемещающихся между портами, аренда яхты может быть связана с luxury car rental, chauffeur service и VIP transfers. Это создаёт один приватный план от аэропорта до отеля, яхты и вечернего возвращения.",
      },
    ],
    ro: [
      {
        title: "Închirieri iahturi de lux în Cannes, Monaco și Saint-Tropez",
        body: "Trans Yacht Group coordonează charter privat de iahturi pe Riviera Franceză, inclusiv Cannes, Monaco, Nisa, Antibes și Saint-Tropez. Serviciul este creat pentru clienți care au nevoie de o selecție atentă, comunicare discretă, îmbarcare flexibilă și concierge dedicat.",
      },
      {
        title: "Charter privat, evenimente și itinerarii personalizate",
        body: "O solicitare de iaht poate fi pregătită pentru o zi pe mare, o celebrare privată, un eveniment corporate, Grand Prix Monaco, Festivalul de Film de la Cannes sau un itinerariu de coastă cu restaurante și beach cluburi. Echipa verifică datele, numărul de invitați, stilul dorit, ruta și serviciile la bord.",
      },
      {
        title: "Transferuri yacht-to-car și mobilitate completă",
        body: "Pentru clienții care sosesc cu jet privat, stau într-o vilă sau se deplasează între porturi, charterul de iaht poate fi coordonat cu închirieri auto de lux, șofer privat și transferuri VIP. Rezultatul este un plan fluent de la aeroport la hotel, iaht și retur.",
      },
    ],
    ar: [
      {
        title: "تأجير يخوت فاخرة في كان وموناكو وسان تروبيه",
        body: "تنظم Trans Yacht Group رحلات يخوت خاصة في الريفييرا الفرنسية، بما في ذلك كان وموناكو ونيس وأنتيب وسان تروبيه. صممت الخدمة للعملاء الذين يحتاجون إلى اختيار دقيق لليخت وتواصل خاص ونقطة صعود مرنة ودعم كونسيرج قبل الرحلة وأثناءها.",
      },
      {
        title: "رحلات خاصة وفعاليات ومسارات مخصصة",
        body: "يمكن تجهيز اليخت ليوم في البحر أو مناسبة خاصة أو فعالية للشركات أو إقامة خلال سباق موناكو أو مهرجان كان أو مسار ساحلي مع مطاعم ونوادٍ شاطئية. يراجع الفريق التواريخ وعدد الضيوف والأسلوب المطلوب والمسار والخدمة على متن اليخت.",
      },
      {
        title: "انتقالات yacht-to-car وتنقل فاخر كامل",
        body: "للعملاء القادمين بطائرة خاصة أو المقيمين في فيلا أو المتنقلين بين الموانئ، يمكن تنسيق اليخت مع تأجير سيارة فاخرة وخدمة سائق وانتقالات VIP. الهدف هو خطة تنقل خاصة واحدة من المطار إلى الفندق واليخت والعودة مساءً.",
      },
    ],
  },
} as const;

const FAQ_SECTIONS = {
  car: {
    en: [
      { question: "Can I rent a luxury car with a chauffeur?", answer: "Yes. Trans Yacht Group can arrange chauffeur-driven luxury cars, VIP transfers and self-drive rentals depending on the route, vehicle and availability." },
      { question: "Where can the car be delivered?", answer: "Cars can be coordinated for Cannes, Monaco, Nice, Saint-Tropez, Antibes, Courchevel, hotels, villas, ports, airports and private aviation terminals." },
      { question: "Which luxury car brands are available?", answer: "Availability changes by date, but requests can include Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, luxury SUVs, supercars and executive vehicles." },
      { question: "Can you arrange airport or yacht transfers?", answer: "Yes. The team can coordinate airport meet-and-greet, yacht-to-car transfers, hotel pickup and multi-day private mobility across the French Riviera." },
    ],
    fr: [
      { question: "Puis-je louer une voiture de luxe avec chauffeur ?", answer: "Oui. Trans Yacht Group peut organiser voitures avec chauffeur, transferts VIP et location sans chauffeur selon le trajet, le véhicule et la disponibilité." },
      { question: "Où la voiture peut-elle être livrée ?", answer: "La livraison peut être coordonnée à Cannes, Monaco, Nice, Saint-Tropez, Antibes, Courchevel, hôtels, villas, ports, aéroports et terminaux privés." },
      { question: "Quelles marques de voitures de luxe sont disponibles ?", answer: "La disponibilité varie selon les dates, mais les demandes peuvent inclure Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, SUV de luxe et supercars." },
      { question: "Organisez-vous des transferts aéroport ou yacht ?", answer: "Oui. L’équipe peut coordonner accueil aéroport, transferts yacht-to-car, prise en charge hôtel et mobilité privée sur plusieurs jours." },
    ],
    ru: [
      { question: "Можно ли арендовать люксовый автомобиль с водителем?", answer: "Да. Trans Yacht Group может организовать автомобиль с водителем, VIP-трансфер или аренду без водителя в зависимости от маршрута, модели и доступности." },
      { question: "Куда можно доставить автомобиль?", answer: "Доставка возможна в Каннах, Монако, Ницце, Сен-Тропе, Антибе, Куршевеле, к отелям, виллам, портам, аэропортам и частным терминалам." },
      { question: "Какие марки премиальных автомобилей доступны?", answer: "Доступность зависит от даты, но заявки могут включать Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, люксовые SUV, суперкары и представительские авто." },
      { question: "Можно ли организовать трансфер из аэропорта или с яхты?", answer: "Да. Команда может организовать встречу в аэропорту, пересадку yacht-to-car, подачу к отелю и частную мобильность на несколько дней." },
    ],
    ro: [
      { question: "Pot închiria o mașină de lux cu șofer?", answer: "Da. Trans Yacht Group poate organiza automobile de lux cu șofer, transferuri VIP sau închiriere self-drive în funcție de traseu, model și disponibilitate." },
      { question: "Unde poate fi livrată mașina?", answer: "Livrarea poate fi coordonată în Cannes, Monaco, Nisa, Saint-Tropez, Antibes, Courchevel, hoteluri, vile, porturi, aeroporturi și terminale private." },
      { question: "Ce mărci de automobile de lux sunt disponibile?", answer: "Disponibilitatea variază, dar cererile pot include Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, SUV-uri de lux, supercaruri și automobile executive." },
      { question: "Puteți organiza transferuri de aeroport sau yacht-to-car?", answer: "Da. Echipa poate coordona întâmpinare la aeroport, transferuri de la iaht la mașină, preluare de la hotel și mobilitate privată." },
    ],
    ar: [
      { question: "هل يمكن استئجار سيارة فاخرة مع سائق؟", answer: "نعم. يمكن لـ Trans Yacht Group تنظيم سيارات فاخرة مع سائق أو انتقالات VIP أو قيادة ذاتية حسب المسار والسيارة والتوفر." },
      { question: "أين يمكن تسليم السيارة؟", answer: "يمكن تنسيق التسليم في كان وموناكو ونيس وسان تروبيه وأنتيب وكورشوفيل والفنادق والفلل والموانئ والمطارات والمحطات الخاصة." },
      { question: "ما هي علامات السيارات الفاخرة المتاحة؟", answer: "يتغير التوفر حسب التاريخ، لكن الطلبات قد تشمل Mercedes-Benz وRolls-Royce وFerrari وLamborghini وسيارات SUV فاخرة وسوبركار." },
      { question: "هل يمكن تنظيم انتقال من المطار أو اليخت؟", answer: "نعم. يمكن للفريق تنسيق استقبال المطار، انتقال yacht-to-car، الاستلام من الفندق وخطة تنقل خاصة لعدة أيام." },
    ],
  },
  yacht: {
    en: [
      { question: "Can I book a private yacht charter on the French Riviera?", answer: "Yes. Trans Yacht Group coordinates private yacht charters from Cannes, Monaco, Nice, Antibes and Saint-Tropez with tailored concierge support." },
      { question: "Can the yacht charter include a custom itinerary?", answer: "Yes. The itinerary can include coastal cruising, restaurants, beach clubs, events, swimming stops and private celebrations depending on the yacht and conditions." },
      { question: "Can you combine yacht charter with car transfers?", answer: "Yes. Yacht charter can be paired with luxury car rental, chauffeur service, airport pickup and yacht-to-car transfers for a complete private journey." },
      { question: "What information is needed for a yacht request?", answer: "The team usually needs preferred dates, guest count, embarkation point, destination ideas, yacht style, onboard service expectations and transfer needs." },
    ],
    fr: [
      { question: "Puis-je réserver un yacht privé sur la Côte d’Azur ?", answer: "Oui. Trans Yacht Group coordonne des charters privés depuis Cannes, Monaco, Nice, Antibes et Saint-Tropez avec conciergerie dédiée." },
      { question: "Le charter peut-il inclure un itinéraire sur mesure ?", answer: "Oui. L’itinéraire peut inclure croisière côtière, restaurants, beach clubs, événements, baignade et célébrations privées selon le yacht et les conditions." },
      { question: "Peut-on combiner yacht et transferts voiture ?", answer: "Oui. Le yacht charter peut être associé à une voiture de luxe, chauffeur privé, accueil aéroport et transferts yacht-to-car." },
      { question: "Quelles informations faut-il pour une demande yacht ?", answer: "L’équipe a généralement besoin des dates, nombre d’invités, point d’embarquement, destinations souhaitées, style de yacht, service à bord et transferts." },
    ],
    ru: [
      { question: "Можно ли забронировать частную яхту на Лазурном Берегу?", answer: "Да. Trans Yacht Group организует частные чартеры из Канн, Монако, Ниццы, Антиба и Сен-Тропе с персональным консьерж-сопровождением." },
      { question: "Можно ли сделать индивидуальный маршрут?", answer: "Да. Маршрут может включать побережье, рестораны, beach clubs, события, купание и частные праздники в зависимости от яхты и условий." },
      { question: "Можно ли совместить яхту с автомобильным трансфером?", answer: "Да. Yacht charter можно связать с премиальным автомобилем, chauffeur service, встречей в аэропорту и пересадкой yacht-to-car." },
      { question: "Какая информация нужна для запроса яхты?", answer: "Обычно нужны даты, количество гостей, место посадки, желаемый маршрут, стиль яхты, ожидания по сервису на борту и трансферам." },
    ],
    ro: [
      { question: "Pot rezerva un yacht charter privat pe Riviera Franceză?", answer: "Da. Trans Yacht Group coordonează charter privat din Cannes, Monaco, Nisa, Antibes și Saint-Tropez cu suport concierge personalizat." },
      { question: "Charterul poate include un itinerariu personalizat?", answer: "Da. Itinerariul poate include coastă, restaurante, beach cluburi, evenimente, opriri pentru înot și celebrări private, în funcție de iaht și condiții." },
      { question: "Puteți combina yacht charter cu transferuri auto?", answer: "Da. Charterul poate fi combinat cu automobil de lux, șofer privat, transfer de aeroport și transferuri yacht-to-car." },
      { question: "Ce informații sunt necesare pentru o cerere de iaht?", answer: "De obicei sunt necesare datele, numărul de invitați, punctul de îmbarcare, ruta dorită, stilul iahtului, serviciile la bord și transferurile." },
    ],
    ar: [
      { question: "هل يمكن حجز يخت خاص في الريفييرا الفرنسية؟", answer: "نعم. تنسق Trans Yacht Group رحلات يخوت خاصة من كان وموناكو ونيس وأنتيب وسان تروبيه مع دعم كونسيرج مخصص." },
      { question: "هل يمكن أن يشمل charter مساراً مخصصاً؟", answer: "نعم. يمكن أن يشمل المسار الساحل والمطاعم والنوادي الشاطئية والفعاليات والتوقف للسباحة والاحتفالات الخاصة حسب اليخت والظروف." },
      { question: "هل يمكن الجمع بين اليخت وانتقالات السيارات؟", answer: "نعم. يمكن دمج yacht charter مع سيارة فاخرة وخدمة سائق واستقبال في المطار وانتقال yacht-to-car." },
      { question: "ما المعلومات المطلوبة لطلب يخت؟", answer: "عادة يحتاج الفريق إلى التواريخ وعدد الضيوف ونقطة الصعود والوجهات المفضلة ونمط اليخت والخدمة المطلوبة على المتن والانتقالات." },
    ],
  },
} as const;

export default function Catalog({ category }: CatalogProps) {
  const [, setLocation] = useLocation();
  const [allCollection, setAllCollection] = useState<any[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState("EUR");
  const [rates, setRates] = useState<Rates>({ EUR: 1 });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const { lang, t } = useLanguage();

  usePageView();

  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR");
      if (res.ok) {
        const data = await res.json();
        setRates({ EUR: 1, ...data.rates });
        setRatesLoaded(true);
      }
    } catch {
      // keep EUR fallback
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles(lang)
      .then((v: any[]) => {
        setAllCollection(Array.isArray(v) ? v : []);
      })
      .catch((err) => {
        console.log("ERROR FETCH VEHICLES:", err);
        setAllCollection([]);
      });

    fetchContent(lang)
      .then((data) => {
        setSiteContent(data || {});
      })
      .catch((err) => {
        console.log("ERROR CONTENT:", err);
      });

    loadRates();
  }, [lang, loadRates]);

  const availableCurrencies = ALL_CURRENCIES.filter(
    (c) => c.code === "EUR" || rates[c.code] !== undefined,
  );

  const convertPrice = useCallback(
    (eurPrice: number): number => {
      if (currency === "EUR") return eurPrice;
      const rate = rates[currency];
      if (!rate) return eurPrice;
      return eurPrice * rate;
    },
    [currency, rates],
  );

  const displayCurrency = rates[currency] !== undefined ? currency : "EUR";
  const items = allCollection.filter((item) => item.category === category);
  const [visibleCount, setVisibleCount] = useState(12);
  const visibleItems = items.slice(0, visibleCount);
  const hasMoreItems = visibleCount < items.length;

  const isYacht = category === "yacht";
  const seoSections = SEO_SECTIONS[category][lang];
  const faqSections = FAQ_SECTIONS[category][lang];
  const faqTitle = {
    en: "Frequently Asked Questions",
    fr: "Questions fréquentes",
    ru: "Частые вопросы",
    ro: "Întrebări frecvente",
    ar: "الأسئلة الشائعة",
  }[lang];
  const seoDetailsTitle = {
    en: isYacht ? "More about luxury yacht charter" : "More about luxury car rental",
    fr: isYacht ? "En savoir plus sur le yacht charter" : "En savoir plus sur la location de voitures de luxe",
    ru: isYacht ? "Подробнее об аренде яхт" : "Подробнее об аренде люксовых автомобилей",
    ro: isYacht ? "Mai multe despre charterul de iahturi" : "Mai multe despre închirieri auto de lux",
    ar: isYacht ? "المزيد عن تأجير اليخوت" : "المزيد عن تأجير السيارات الفاخرة",
  }[lang];

  const title = isYacht
    ? siteContent.yacht_section_title || "Ocean Prestige"
    : siteContent.car_section_title || "Road Sovereign";
  const seoTitle = isYacht
    ? {
        en: "Luxury Yacht Charter on the French Riviera",
        fr: "Location de yachts de luxe sur la Côte d’Azur",
        ru: "Аренда яхт на Лазурном Берегу",
        ro: "Închirieri iahturi de lux pe Riviera Franceză",
        ar: "تأجير اليخوت الفاخرة في الريفييرا الفرنسية",
      }[lang]
    : {
        en: "Luxury Car Rental on the French Riviera",
        fr: "Location de voitures de luxe sur la Côte d’Azur",
        ru: "Аренда люксовых автомобилей на Лазурном Берегу",
        ro: "Închirieri automobile de lux pe Riviera Franceză",
        ar: "تأجير السيارات الفاخرة في الريفييرا الفرنسية",
      }[lang];

  const subtitle = isYacht
    ? siteContent.yacht_section_subtitle || "Superyacht Collection"
    : siteContent.car_section_subtitle || "Elite Automotive";

  const description = isYacht
    ? siteContent.yacht_section_desc ||
      "Curated fleet of exceptional superyachts, delivering unparalleled privacy and luxury on the open water."
    : siteContent.car_section_desc ||
      "Elite automotive experiences without limits. Access the world's most sought-after hypercars and luxury vehicles.";

  const subtitleSize = isYacht
    ? getFontSize(siteContent.yacht_section_subtitle_size, "10px")
    : getFontSize(siteContent.car_section_subtitle_size, "10px");

  const descriptionSize = isYacht
    ? getFontSize(siteContent.yacht_section_desc_size, "14px")
    : getFontSize(siteContent.car_section_desc_size, "14px");

  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      <Navbar />

      <section className="relative pt-24 md:pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="hidden md:block absolute top-0 left-1/3 w-[600px] h-[400px] bg-gold/[0.04] rounded-full blur-[180px]" />
          <div className="hidden md:block absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-gold-dark/[0.03] rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <button
              onClick={() => setLocation("/")}
              className="font-porter inline-flex items-center gap-2 text-white/30 hover:text-gold/70 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] font-light mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
              {t("back_to_home")}
            </button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <CmsContent
              as="p"
              html={subtitle}
              className="uppercase tracking-[0.5em] text-gold/50 mb-5 font-light"
              style={{ fontSize: subtitleSize }}
            />

            <CmsContent
              as="h1"
              html={seoTitle}
              className="section-display-title mx-auto max-w-5xl text-balance font-serif text-white"
            />

            <CmsContent
              as="p"
              html={title}
              className="mt-5 uppercase tracking-[0.4em] text-white/30 font-light"
              style={{ fontSize: subtitleSize }}
            />

            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="gold-line w-20" />
              <div className="gold-dot" />
              <div className="gold-line w-20" />
            </div>

            <CmsContent
              as="div"
              html={description}
              className="text-white/35 font-light tracking-wide max-w-xl mx-auto leading-relaxed"
              style={{ fontSize: descriptionSize }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center mb-14"
          >
            <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-full px-5 py-2.5 md:backdrop-blur-xl">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-light">
                {t("currency")}
              </span>
              <div className="w-px h-4 bg-white/[0.08]" />
              <div className="flex gap-1 flex-wrap justify-center">
                {availableCurrencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] rounded-full transition-all duration-300 ${
                      currency === c.code
                        ? "bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)] border border-[hsl(43,67%,55%)]/30"
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              {ratesLoading && (
                <RefreshCw className="w-3 h-3 text-white/20 animate-spin" />
              )}

              {!ratesLoading &&
                !ratesLoaded &&
                availableCurrencies.length <= 1 && (
                  <span className="text-white/20 text-[9px] tracking-wider">
                    {t("rates_unavailable")}
                  </span>
                )}
            </div>
          </motion.div>

          {items.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {visibleItems.map((item: any) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  fadeInUp={fadeInUp}
                  convertPrice={convertPrice}
                  displayCurrency={displayCurrency}
                  siteContent={siteContent}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 border border-white/[0.05] rounded-2xl bg-white/[0.02]">
              <p className="text-white/50 text-sm tracking-wide">
                Catalog is being updated.
              </p>
            </div>
          )}
          {hasMoreItems && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-3 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-[hsl(43,67%,55%)]/30 hover:bg-[hsl(43,67%,55%)]/10 transition-all text-[10px] uppercase tracking-[0.25em] font-light"
              >
                Load More
              </button>
            </div>
          )}

          <section className="mt-12 border-t border-white/[0.05] pt-8">
            <details className="group rounded-2xl border border-white/[0.06] bg-white/[0.018]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-xs uppercase tracking-[0.22em] text-white/35 transition hover:text-gold md:px-6">
                <span>{seoDetailsTitle}</span>
                <span className="text-gold/60 transition group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-white/[0.05] px-5 py-6 md:px-6">
                <div className="grid gap-5 lg:grid-cols-3">
                  {seoSections.map((section) => (
                    <article key={section.title}>
                      <h2 className="mb-3 font-serif text-xl leading-tight text-white/85">
                        {section.title}
                      </h2>
                      <p className="text-sm font-light leading-7 text-white/50">
                        {section.body}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-8 rounded-xl border border-gold/10 bg-gold/[0.025] p-5">
                  <h2 className="mb-5 font-serif text-2xl leading-tight text-white/90">
                    {faqTitle}
                  </h2>
                  <div className="grid gap-5 md:grid-cols-2">
                    {faqSections.map((item) => (
                      <article key={item.question}>
                        <h3 className="mb-2 text-sm font-medium leading-snug text-gold/90">
                          {item.question}
                        </h3>
                        <p className="text-sm font-light leading-7 text-white/50">
                          {item.answer}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </section>
        </div>
      </section>

      <footer className="bg-black relative z-10 overflow-hidden">
        <div className="gold-line w-full opacity-30" />
        <div className="pt-16 pb-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="border-t border-white/[0.05] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase font-light">
                &copy; {new Date().getFullYear()} TRANSYACHTGROUP.{" "}
                {t("rights_reserved")}
              </p>
              <div className="flex gap-8">
                <a
                  href="#"
                  className="text-white/20 hover:text-gold/60 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] font-light"
                >
                  {t("instagram")}
                </a>
                <a
                  href="#"
                  className="text-white/20 hover:text-gold/60 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] font-light"
                >
                  {t("linkedin")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CatalogCard({
  item,
  fadeInUp,
  convertPrice,
  displayCurrency,
  siteContent,
}: {
  item: any;
  fadeInUp: any;
  convertPrice: (eurPrice: number) => number;
  displayCurrency: string;
  siteContent: Record<string, string>;
}) {
  const [, setLocation] = useLocation();
  const { lang, t } = useLanguage();
  const specs = item.specs || {};
  const getInlineStyle = (value: unknown) => {
    const html = String(value || "");
    const match = html.match(/<span[^>]*style="([^"]*)"[^>]*>/i);
    return match?.[1] || "";
  };

  const withOriginalStyle = (text: string, originalValue: unknown) => {
    const style = getInlineStyle(originalValue);
    return style ? `<span style="${style}">${text}</span>` : text;
  };

  const stripHtml = (s: string) =>
    s
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#?\w+;/g, "")
      .trim();

  const extractNum = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    const plain = stripHtml(String(value)).replace(/[^\d.\-]/g, "");
    return parseFloat(plain) || 0;
  };

  const priceEur = extractNum(specs.pricePerDay);
  const convertedPrice = convertPrice(priceEur);

  const allImages: string[] =
    item.images && Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.image
        ? [item.image]
        : [];

  const hasMultiple = allImages.length > 1;
  const [currentIdx, setCurrentIdx] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % allImages.length);
  };

  const goToDetail = () => setLocation(`${vehiclePath(item)}?lang=${lang}`);

  const phoneNumber = siteContent.phone_number || "";
  const whatsappNumber = siteContent.whatsapp_number || phoneNumber;
  const cleanPhone = stripHtml(phoneNumber).replace(/\s+/g, "");
  const cleanWhatsapp = stripHtml(whatsappNumber).replace(/[\s+]/g, "");

  return (
    <motion.div
      variants={fadeInUp}
      className="relative group bg-card/50 rounded-xl overflow-hidden border border-white/[0.04] hover-glow-gold flex flex-col h-full cursor-pointer"
      onClick={goToDetail}
    >
      <a
        href={`${vehiclePath(item)}/?lang=${lang}`}
        aria-label={`${t("view_details")}: ${stripHtml(item.name || "")}`}
        onClick={(event) => {
          event.preventDefault();
          goToDetail();
        }}
        className="absolute inset-0 z-[11]"
      />
      <div className="aspect-[4/3] w-full overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent z-10 opacity-80 pointer-events-none" />

        <img
          src={allImages[currentIdx] || item.image}
          alt={stripHtml(item.name || "")}
          className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        <div className="absolute top-4 left-4 z-20">
          <span className="px-3 py-1.5 bg-black/70 backdrop-blur-xl border border-white/[0.06] rounded-full text-[9px] uppercase tracking-[0.2em] text-white/70 font-light">
            {item.category}
          </span>
        </div>

        {hasMultiple && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={16} />
            </button>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIdx(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIdx
                      ? "bg-[hsl(43,67%,55%)] w-3"
                      : "bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {hasMultiple && (
          <div className="absolute top-4 right-4 z-20">
            <span className="px-2 py-1 bg-black/70 backdrop-blur-xl border border-white/[0.06] rounded-full text-[8px] text-white/50 font-light">
              {currentIdx + 1}/{allImages.length}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <CmsContent
          as="h3"
          className="vehicle-card-title mb-2 line-clamp-3 min-h-[3.9rem] text-balance font-porter text-base leading-[1.3] tracking-[-0.01em] text-white sm:text-[1.05rem]"
          html={item.name}
        />

        <CmsContent
          as="p"
          className="text-white/35 text-sm mb-4 font-light font-porter vehicle-description"
          html={item.description}
        />

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.04]">
          {priceEur > 0 ? (
            <div>
              <div>
                <CmsContent
                  as="span"
                  className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                  html={withOriginalStyle(
                    formatPrice(convertedPrice, displayCurrency),
                    specs.pricePerDay,
                  )}
                />
                <span className="text-white/25 text-[10px] ml-1">
                  {t("per_day")}
                </span>
              </div>

              {item.category === "car" &&
                extractNum(specs.pricePerThreeDays) > 0 && (
                  <div className="mt-0.5">
                    <CmsContent
                      as="span"
                      className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                      html={withOriginalStyle(
                        formatPrice(
                          convertPrice(extractNum(specs.pricePerThreeDays)),
                          displayCurrency,
                        ),
                        specs.pricePerThreeDays,
                      )}
                    />
                    <span className="text-white/25 text-[10px] ml-1">
                      / 3 days
                    </span>
                  </div>
                )}
              {item.category === "car" &&
                extractNum(specs.pricePerMonth) > 0 && (
                  <div className="mt-0.5">
                    <CmsContent
                      as="span"
                      className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                      html={withOriginalStyle(
                        formatPrice(
                          convertPrice(extractNum(specs.pricePerMonth)),
                          displayCurrency,
                        ),
                        specs.pricePerMonth,
                      )}
                    />
                    <span className="text-white/25 text-[10px] ml-1">
                      / month
                    </span>
                  </div>
                )}

              {item.category === "yacht" && priceEur > 0 && (
                <div className="mt-0.5">
                  <CmsContent
                    as="span"
                    className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                    html={withOriginalStyle(
                      formatPrice(
                        convertPrice(Math.round(priceEur * 6)),
                        displayCurrency,
                      ),
                      specs.pricePerDay,
                    )}
                  />
                  <span className="text-white/25 text-[10px] ml-1">/ week</span>

                  {specs.pricingType && (
                    <span
                      className={`ml-1.5 text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full border ${
                        specs.pricingType === "plus APA"
                          ? "text-amber-400/70 border-amber-500/15 bg-amber-500/5"
                          : "text-emerald-400/70 border-emerald-500/15 bg-emerald-500/5"
                      }`}
                    >
                      {specs.pricingType === "plus APA" ? "+ APA" : "All incl."}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gold/60 text-[11px] tracking-[0.15em] uppercase font-light">
              {t("on_request")}
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToDetail();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-gold hover:text-black hover:border-gold transition-all duration-500"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {(cleanPhone || cleanWhatsapp) && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/[0.04]">
            {cleanPhone ? (
              <a
                href={`tel:${cleanPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white hover:border-[hsl(43,67%,55%)]/30 hover:bg-[hsl(43,67%,55%)]/10 transition-all text-[9px] uppercase tracking-[0.15em] font-light"
              >
                <Phone size={12} />
                {t("call")}
              </a>
            ) : (
              <div />
            )}

            {cleanWhatsapp ? (
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                  `${t("interested_in")} ${stripHtml(item.name || "")}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-green-600/20 bg-green-600/5 text-green-400/60 hover:text-green-300 hover:bg-green-600/15 transition-all text-[9px] uppercase tracking-[0.15em] font-light"
              >
                <MessageCircle size={12} />
                {t("whatsapp")}
              </a>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
