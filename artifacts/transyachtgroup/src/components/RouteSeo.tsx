import { useLocation } from "wouter";

import { SeoHead, SITE_URL } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";

const COPY: Record<
  LangCode,
  Record<string, { title: string; description: string }>
> = {
  en: {
    home: {
      title: "Luxury Car Rental & Yacht Charter on the French Riviera",
      description:
        "Private luxury car rental and yacht charter in Cannes, Monaco, Nice and Saint-Tropez. A curated fleet and dedicated concierge service.",
    },
    cars: {
      title: "Luxury & Supercar Rental on the French Riviera",
      description:
        "Discover luxury cars and supercars for rent in Cannes, Monaco, Nice and Saint-Tropez with private delivery and concierge support.",
    },
    yachts: {
      title: "Luxury Yacht Charter on the French Riviera",
      description:
        "Explore private yacht charters from Cannes, Monaco, Nice and Saint-Tropez with a dedicated Trans Yacht Group concierge.",
    },
    about: {
      title: "About Trans Yacht Group",
      description:
        "Meet the Cannes-based private mobility concierge specialising in luxury car rental and yacht charter across the French Riviera.",
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "Read the Trans Yacht Group privacy policy and learn how personal information is handled.",
    },
    legal: {
      title: "Legal Notice",
      description:
        "Legal information and company details for Trans Yacht Group.",
    },
  },
  fr: {
    home: {
      title: "Location de voitures de luxe & yachts sur la Côte d’Azur",
      description:
        "Location privée de voitures de luxe et charter de yachts à Cannes, Monaco, Nice et Saint-Tropez avec conciergerie dédiée.",
    },
    cars: {
      title: "Location de voitures de luxe sur la Côte d’Azur",
      description:
        "Découvrez nos voitures de luxe et supercars à louer à Cannes, Monaco, Nice et Saint-Tropez, avec livraison privée.",
    },
    yachts: {
      title: "Location de yachts de luxe sur la Côte d’Azur",
      description:
        "Découvrez nos yachts privés au départ de Cannes, Monaco, Nice et Saint-Tropez avec une conciergerie dédiée.",
    },
    about: {
      title: "À propos de Trans Yacht Group",
      description:
        "Découvrez notre conciergerie basée à Cannes, spécialisée dans la location automobile de prestige et le charter de yachts.",
    },
    privacy: {
      title: "Politique de confidentialité",
      description:
        "Consultez la politique de confidentialité de Trans Yacht Group.",
    },
    legal: {
      title: "Mentions légales",
      description:
        "Mentions légales et informations de la société Trans Yacht Group.",
    },
  },
  ru: {
    home: {
      title: "Аренда премиальных авто и яхт на Лазурном Берегу",
      description:
        "Премиальная аренда автомобилей и яхт в Каннах, Монако, Ницце и Сен-Тропе. Персональный консьерж Trans Yacht Group.",
    },
    cars: {
      title: "Аренда люксовых автомобилей на Лазурном Берегу",
      description:
        "Каталог премиальных автомобилей и суперкаров в Каннах, Монако, Ницце и Сен-Тропе с индивидуальной доставкой.",
    },
    yachts: {
      title: "Аренда яхт на Лазурном Берегу",
      description:
        "Частные яхты в Каннах, Монако, Ницце и Сен-Тропе с персональным сопровождением Trans Yacht Group.",
    },
    about: {
      title: "О компании Trans Yacht Group",
      description:
        "Консьерж-сервис из Канн для аренды премиальных автомобилей и яхт на Лазурном Берегу.",
    },
    privacy: {
      title: "Политика конфиденциальности",
      description: "Политика обработки данных Trans Yacht Group.",
    },
    legal: {
      title: "Правовая информация",
      description: "Юридические сведения о компании Trans Yacht Group.",
    },
  },
  ro: {
    home: {
      title: "Închirieri auto de lux și iahturi pe Riviera Franceză",
      description:
        "Închirieri private de automobile de lux și iahturi în Cannes, Monaco, Nisa și Saint-Tropez, cu servicii concierge.",
    },
    cars: {
      title: "Închirieri automobile de lux pe Riviera Franceză",
      description:
        "Descoperiți automobile de lux și supercaruri în Cannes, Monaco, Nisa și Saint-Tropez.",
    },
    yachts: {
      title: "Închirieri iahturi de lux pe Riviera Franceză",
      description:
        "Charter privat de iahturi din Cannes, Monaco, Nisa și Saint-Tropez cu concierge dedicat.",
    },
    about: {
      title: "Despre Trans Yacht Group",
      description:
        "Serviciu concierge din Cannes pentru automobile de lux și charter de iahturi.",
    },
    privacy: {
      title: "Politica de confidențialitate",
      description: "Politica de confidențialitate Trans Yacht Group.",
    },
    legal: {
      title: "Informații juridice",
      description: "Informații juridice despre Trans Yacht Group.",
    },
  },
  ar: {
    home: {
      title: "تأجير السيارات الفاخرة واليخوت في الريفييرا الفرنسية",
      description:
        "تأجير خاص للسيارات الفاخرة واليخوت في كان وموناكو ونيس وسان تروبيه مع خدمة كونسيرج مخصصة.",
    },
    cars: {
      title: "تأجير السيارات الفاخرة في الريفييرا الفرنسية",
      description:
        "اكتشف السيارات الفاخرة والسوبركار المتاحة في كان وموناكو ونيس وسان تروبيه.",
    },
    yachts: {
      title: "تأجير اليخوت الفاخرة في الريفييرا الفرنسية",
      description:
        "رحلات يخوت خاصة من كان وموناكو ونيس وسان تروبيه مع خدمة كونسيرج.",
    },
    about: {
      title: "حول Trans Yacht Group",
      description:
        "خدمة كونسيرج مقرها كان متخصصة في السيارات الفاخرة وتأجير اليخوت.",
    },
    privacy: {
      title: "سياسة الخصوصية",
      description: "سياسة الخصوصية الخاصة بـ Trans Yacht Group.",
    },
    legal: {
      title: "المعلومات القانونية",
      description: "المعلومات القانونية لشركة Trans Yacht Group.",
    },
  },
};

const organization = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "Trans Yacht Group",
  legalName: "TRANS YACHT GROUPE SARL",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-transparent.png`,
  image: `${SITE_URL}/opengraph.jpg`,
  email: "info@transyachtgroup.com",
  telephone: "+33768883888",
  address: {
    "@type": "PostalAddress",
    streetAddress: "49 Boulevard d’Alsace",
    postalCode: "06400",
    addressLocality: "Cannes",
    addressCountry: "FR",
  },
  areaServed: ["Cannes", "Monaco", "Nice", "Antibes", "Saint-Tropez"],
};

const ROUTE_FAQ: Partial<
  Record<
    LangCode,
    Record<"cars" | "yachts", { question: string; answer: string }[]>
  >
> = {
  en: {
    cars: [
      {
        question: "Can I rent a luxury car with a chauffeur?",
        answer:
          "Yes. Trans Yacht Group can arrange chauffeur-driven luxury cars, VIP transfers and self-drive rentals depending on the route, vehicle and availability.",
      },
      {
        question: "Where can the car be delivered?",
        answer:
          "Cars can be coordinated for Cannes, Monaco, Nice, Saint-Tropez, Antibes, Courchevel, hotels, villas, ports, airports and private aviation terminals.",
      },
      {
        question: "Which luxury car brands are available?",
        answer:
          "Requests can include Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, luxury SUVs, supercars and executive vehicles, subject to availability.",
      },
    ],
    yachts: [
      {
        question: "Can I book a private yacht charter on the French Riviera?",
        answer:
          "Yes. Trans Yacht Group coordinates private yacht charters from Cannes, Monaco, Nice, Antibes and Saint-Tropez with tailored concierge support.",
      },
      {
        question: "Can the yacht charter include a custom itinerary?",
        answer:
          "Yes. The itinerary can include coastal cruising, restaurants, beach clubs, events, swimming stops and private celebrations depending on the yacht and conditions.",
      },
      {
        question: "Can you combine yacht charter with car transfers?",
        answer:
          "Yes. Yacht charter can be paired with luxury car rental, chauffeur service, airport pickup and yacht-to-car transfers for a complete private journey.",
      },
    ],
  },
  fr: {
    cars: [
      {
        question: "Puis-je louer une voiture de luxe avec chauffeur ?",
        answer:
          "Oui. Trans Yacht Group peut organiser voitures avec chauffeur, transferts VIP et location sans chauffeur selon le trajet, le véhicule et la disponibilité.",
      },
      {
        question: "Où la voiture peut-elle être livrée ?",
        answer:
          "La livraison peut être coordonnée à Cannes, Monaco, Nice, Saint-Tropez, Antibes, Courchevel, hôtels, villas, ports, aéroports et terminaux privés.",
      },
      {
        question: "Quelles marques de voitures de luxe sont disponibles ?",
        answer:
          "Les demandes peuvent inclure Mercedes-Benz, Rolls-Royce, Ferrari, Lamborghini, SUV de luxe et supercars, selon la disponibilité.",
      },
    ],
    yachts: [
      {
        question: "Puis-je réserver un yacht privé sur la Côte d’Azur ?",
        answer:
          "Oui. Trans Yacht Group coordonne des charters privés depuis Cannes, Monaco, Nice, Antibes et Saint-Tropez avec conciergerie dédiée.",
      },
      {
        question: "Le charter peut-il inclure un itinéraire sur mesure ?",
        answer:
          "Oui. L’itinéraire peut inclure croisière côtière, restaurants, beach clubs, événements, baignade et célébrations privées selon le yacht et les conditions.",
      },
      {
        question: "Peut-on combiner yacht et transferts voiture ?",
        answer:
          "Oui. Le yacht charter peut être associé à une voiture de luxe, chauffeur privé, accueil aéroport et transferts yacht-to-car.",
      },
    ],
  },
};

const buildFaqSchema = (
  faqs: { question: string; answer: string }[] | undefined,
) =>
  faqs
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

export function RouteSeo() {
  const [location] = useLocation();
  const { lang } = useLanguage();
  const path = location.split("?")[0] || "/";
  const isAdmin = path.startsWith("/admin");
  const isVehicle =
    path.startsWith("/vehicle/") ||
    /^\/(?:cars|yachts)\/[^/]+-\d+\/?$/.test(path);
  const isLocation = path.startsWith("/locations/");
  const isService = path.startsWith("/services/");
  const isGuide = path === "/guides" || path.startsWith("/guides/");
  const key =
    path === "/cars"
      ? "cars"
      : path === "/yachts"
        ? "yachts"
        : path === "/about"
          ? "about"
          : path === "/privacy"
            ? "privacy"
            : path === "/legal"
              ? "legal"
              : "home";
  const copy = COPY[lang][key];
  const faqSchema =
    key === "cars" || key === "yachts"
      ? buildFaqSchema(ROUTE_FAQ[lang]?.[key] || ROUTE_FAQ.en?.[key])
      : null;

  if (isVehicle || isLocation || isService || isGuide) return null;
  if (isAdmin) {
    return (
      <SeoHead
        title="Administration"
        description="Trans Yacht Group administration."
        path={path}
        lang={lang}
        robots="noindex,nofollow,noarchive"
      />
    );
  }

  return (
    <SeoHead
      {...copy}
      path={path}
      lang={lang}
      jsonLd={[
        organization,
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "Trans Yacht Group",
          inLanguage: lang,
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
        ...(faqSchema ? [faqSchema] : []),
      ]}
    />
  );
}
