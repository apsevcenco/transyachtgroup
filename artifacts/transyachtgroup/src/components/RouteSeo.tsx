import { useLocation } from "wouter";

import { SeoHead, SITE_URL, pageUrl } from "@/components/SeoHead";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import { ROUTE_COPY } from "@/data/routeSeoCopy";

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

const buildCatalogServiceSchema = (
  key: string,
  copy: { title: string; description: string },
  lang: LangCode,
) => {
  if (key !== "cars" && key !== "yachts") return null;

  const path = key === "cars" ? "/cars" : "/yachts";
  const serviceType =
    key === "cars"
      ? "Luxury car rental and chauffeur service"
      : "Luxury yacht charter";

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl(path, lang)}#service`,
    name: copy.title,
    description: copy.description,
    serviceType,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: [
      "Cannes",
      "Monaco",
      "Nice",
      "Saint-Tropez",
      "Antibes",
      "Courchevel",
      "French Riviera",
    ],
    url: pageUrl(path, lang),
    inLanguage: lang,
  };
};

const buildBreadcrumbSchema = (
  key: string,
  copy: { title: string; description: string },
  lang: LangCode,
) => {
  if (key !== "cars" && key !== "yachts") return null;

  const path = key === "cars" ? "/cars" : "/yachts";
  return {
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
        name: copy.title,
        item: pageUrl(path, lang),
      },
    ],
  };
};

export function RouteSeo() {
  const [location] = useLocation();
  const { lang } = useLanguage();
  // /cars/ and /cars are the same route; the trailing slash must not turn it into the home page.
  const path = (location.split("?")[0] || "/").replace(/\/+$/, "") || "/";
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
  const copy = ROUTE_COPY[lang][key];
  const faqSchema =
    key === "cars" || key === "yachts"
      ? buildFaqSchema(ROUTE_FAQ[lang]?.[key] || ROUTE_FAQ.en?.[key])
      : null;
  const catalogServiceSchema = buildCatalogServiceSchema(key, copy, lang);
  const breadcrumbSchema = buildBreadcrumbSchema(key, copy, lang);

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
        ...(catalogServiceSchema ? [catalogServiceSchema] : []),
        ...(breadcrumbSchema ? [breadcrumbSchema] : []),
        ...(faqSchema ? [faqSchema] : []),
      ]}
    />
  );
}
