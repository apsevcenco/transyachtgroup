/**
 * SEO helpers for vehicle pages, shared by the React page and the build-time prerender.
 * Pure module (no imports): the prerender script loads it directly.
 */
export type VehicleLike = {
  id: number | string;
  name: unknown;
  category?: string | null;
  specs?: Record<string, unknown> | null;
};

const plain = (value: unknown) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const isYacht = (vehicle: VehicleLike) => vehicle.category === "yacht";

/** "PRESTIGE" -> "Prestige" only when the whole string is upper-case; short tokens (GTO, AMG) stay. */
function titleCaseIfShouting(value: string): string {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || letters !== letters.toUpperCase()) return value;
  return value.replace(/[A-Za-z]{4,}/g, (word) => word[0] + word.slice(1).toLowerCase());
}

/** Plain-text, tidy name for titles and structured data (typos fixed, French/CAPS cleaned for yachts). */
export function seoVehicleName(vehicle: VehicleLike): string {
  const name = plain(vehicle.name).replace(/\bConvertable\b/gi, "Convertible");
  if (!isYacht(vehicle)) return name;
  const [model, ...tail] = name.split(/\s+[–-]\s+/);
  return [titleCaseIfShouting(model), ...tail.map((part) => part.replace(/\b(\d+)\s*Passagers?\b/gi, "$1 guests").replace(/\b(\d+(?:\.\d+)?)M\b/g, "$1m"))].join(" – ");
}

/** Model name without the "– 27m – 12 guests" tail that yacht listings carry. */
export function vehicleShortName(vehicle: VehicleLike): string {
  const name = seoVehicleName(vehicle);
  return isYacht(vehicle) ? name.replace(/\s*[–-]\s*\d+(?:\.\d+)?\s*m\b.*$/i, "").trim() || name : name;
}

type ServiceLink = { href: string; label: string };

const BRAND_SERVICES: Array<{ match: RegExp; links: ServiceLink[] }> = [
  { match: /mercedes/i, links: [
    { href: "/services/mercedes-rental-courchevel/", label: "Mercedes-Benz rental in Courchevel" },
    { href: "/services/mercedes-rental-french-riviera/", label: "Mercedes-Benz rental on the French Riviera" },
  ] },
  { match: /rolls[\s-]?royce/i, links: [
    { href: "/services/rolls-royce-rental-courchevel/", label: "Rolls-Royce rental in Courchevel" },
    { href: "/services/rolls-royce-rental-french-riviera/", label: "Rolls-Royce rental on the French Riviera" },
  ] },
  { match: /bentley/i, links: [{ href: "/services/bentley-rental-courchevel/", label: "Bentley rental in Courchevel" }] },
  { match: /lamborghini/i, links: [
    { href: "/services/lamborghini-rental-courchevel/", label: "Lamborghini rental in Courchevel" },
    { href: "/services/lamborghini-rental-french-riviera/", label: "Lamborghini rental on the French Riviera" },
  ] },
  { match: /ferrari/i, links: [
    { href: "/services/ferrari-rental-courchevel/", label: "Ferrari rental in Courchevel" },
    { href: "/services/ferrari-rental-french-riviera/", label: "Ferrari rental on the French Riviera" },
  ] },
];

const CAR_AREA_SERVICES: ServiceLink[] = [
  { href: "/services/luxury-car-rental-courchevel/", label: "Luxury car rental in Courchevel" },
  { href: "/services/luxury-car-rental-monaco/", label: "Luxury car rental in Monaco" },
  { href: "/services/luxury-car-rental-cannes/", label: "Luxury car rental in Cannes" },
];

const YACHT_SERVICES: ServiceLink[] = [
  { href: "/services/yacht-charter-cannes/", label: "Yacht charter in Cannes" },
  { href: "/services/yacht-charter-monaco/", label: "Yacht charter in Monaco" },
  { href: "/services/yacht-charter-nice/", label: "Yacht charter in Nice" },
  { href: "/services/yacht-charter-saint-tropez/", label: "Yacht charter in Saint-Tropez" },
];

/** Service pages relevant to a vehicle: brand pages first for cars, then the main destinations (max 5). */
export function vehicleServiceLinks(vehicle: VehicleLike): ServiceLink[] {
  if (isYacht(vehicle)) return YACHT_SERVICES;
  const name = plain(vehicle.name);
  const brand = BRAND_SERVICES.find((entry) => entry.match.test(name))?.links || [];
  const seen = new Set<string>();
  return [...brand, ...CAR_AREA_SERVICES].filter((link) => !seen.has(link.href) && seen.add(link.href)).slice(0, 5);
}

const brandOf = (vehicle: VehicleLike) => plain(vehicle.name).toLowerCase().split(/[\s-]+/)[0] || "";

/** Other vehicles of the same kind to browse next: same brand first, then catalogue order. */
export function relatedVehicles<T extends VehicleLike>(vehicles: T[], current: VehicleLike, limit = 4): T[] {
  const kind = isYacht(current);
  const brand = brandOf(current);
  return vehicles
    .filter((item) => isYacht(item) === kind && String(item.id) !== String(current.id) && plain(item.name))
    .map((item, index) => ({ item, index, value: brandOf(item) === brand ? 1 : 0 }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

const num = (value: unknown): number => {
  const parsed = parseFloat(plain(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Factual summary built only from the listing's own specs, for yachts that have no written description yet.
 * Returns [] for cars and when there is not enough data. A real description always takes precedence.
 */
export function yachtSummary(vehicle: VehicleLike): string[] {
  if (!isYacht(vehicle)) return [];
  const specs = vehicle.specs || {};
  const length = num(specs.length);
  const guests = num(specs.guests);
  if (!length || !guests) return [];
  const name = vehicleShortName(vehicle);
  const rawBuilder = titleCaseIfShouting(plain(specs.builder));
  // "Riva from Riva" reads badly: skip the builder when the model name already starts with it.
  const builder = rawBuilder && !name.toLowerCase().startsWith(rawBuilder.toLowerCase().split(/[\s(]/)[0]) ? rawBuilder : "";
  const cabins = num(specs.cabins);
  const crew = num(specs.crew);
  const beam = num(specs.beam);
  const speed = num(specs.cruisingSpeed);

  const profile = [
    `accommodates up to ${plural(guests, "guest")}`,
    cabins ? `with ${plural(cabins, "cabin")}` : "",
    crew ? `and a crew of ${crew}` : "",
  ].filter(Boolean).join(" ");
  const figures = [
    beam ? `a beam of ${beam} m` : "",
    speed ? `a cruising speed of about ${speed} knots` : "",
  ].filter(Boolean);

  const route = length < 13
    ? "A yacht of this size suits day trips along the coast, for example from Cannes to the Lérins Islands or around the Bay of Saint-Tropez."
    : length < 25
      ? "A yacht of this size suits day cruises and short stays on board along the coast between Cannes, Antibes, Monaco and Saint-Tropez."
      : "A yacht of this size suits longer, multi-day itineraries along the Mediterranean coast as well as day cruises from the Riviera ports.";

  const apa = plain(specs.pricingType).toLowerCase().includes("apa")
    ? " The daily rate is quoted plus APA (Advance Provisioning Allowance), which typically covers fuel, provisions and port fees and is settled at the end of the charter."
    : "";

  return [
    `${name} is a ${length} m yacht${builder ? ` from ${builder}` : ""}, available for private charter on the French Riviera.`,
    `She ${profile}${figures.length ? `, with ${figures.join(" and ")}` : ""}. ${route}`,
    `Every charter is arranged individually.${apa} Availability, itinerary, crew and optional extras are confirmed on request.`,
  ];
}
