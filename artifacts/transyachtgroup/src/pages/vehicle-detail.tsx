import { useState, useEffect, useCallback } from "react";
import type { Variants } from "framer-motion";
import { motion, AnimatePresence } from "@/lib/motion-shim";
import { ArrowLeft, ChevronLeft, ChevronRight, X, Maximize2, Ship, Car as CarIcon, Phone, MessageCircle, FileDown, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useLocation } from "wouter";
import { fetchVehicle, fetchContent, downloadVehicleProposal } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageView, trackVehicleView } from "@/hooks/useAnalytics";
import { CmsContent } from "@/components/CmsContent";

function getCarSpecLabels(units: "metric" | "imperial", t: (key: string) => string): Record<string, string> {
  const m = units === "metric";
  return {
    engine: t("spec_engine"),
    horsepower: t("spec_power"),
    torque: m ? `${t("spec_torque")} (Nm)` : `${t("spec_torque")} (lb·ft)`,
    acceleration: m ? t("spec_acceleration") : "0–60 mph",
    topSpeed: m ? `${t("spec_top_speed")} (km/h)` : `${t("spec_top_speed")} (mph)`,
    transmission: t("spec_transmission"),
    drivetrain: t("spec_drivetrain"),
    seats: t("spec_seats"),
    fuelType: t("spec_fuel_type"),
    year: t("spec_year"),
    kmIncluded: t("spec_km_included"),
    extraPricePerKm: t("spec_extra_price_km"),
    deposit: t("spec_deposit"),
  };
}

function getYachtSpecLabels(units: "metric" | "imperial", t: (key: string) => string): Record<string, string> {
  const m = units === "metric";
  return {
    length: m ? `${t("spec_length")} (m)` : `${t("spec_length")} (ft)`,
    beam: m ? `${t("spec_beam")} (m)` : `${t("spec_beam")} (ft)`,
    draft: m ? `${t("spec_draft")} (m)` : `${t("spec_draft")} (ft)`,
    cabins: t("spec_cabins"),
    guests: t("spec_guests"),
    crew: t("spec_crew"),
    cruisingSpeed: `${t("spec_cruising_speed")} (knots)`,
    maxSpeed: `${t("spec_max_speed")} (knots)`,
    fuelCapacity: m ? `${t("spec_fuel_capacity")} (L)` : `${t("spec_fuel_capacity")} (gal)`,
    waterCapacity: m ? `${t("spec_water_capacity")} (L)` : `${t("spec_water_capacity")} (gal)`,
    yearBuilt: t("spec_year_built"),
    builder: t("spec_builder"),
    type: t("spec_type"),
    passengers: t("spec_passengers"),
  };
}

const ALL_CURRENCIES: { code: string; symbol: string }[] = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "CHF", symbol: "CHF" },
];

type Rates = Record<string, number>;

function formatPrice(amount: number, currency: string): string {
  const curr = ALL_CURRENCIES.find(c => c.code === currency);
  const symbol = curr?.symbol || currency;
  const formatted = Math.round(amount).toLocaleString("en-US");
  return `${symbol} ${formatted}`;
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const METRIC_TO_IMPERIAL: Record<string, { factor: number; fromUnit: string; toUnit: string }> = {
  length: { factor: 3.28084, fromUnit: "m", toUnit: "ft" },
  beam: { factor: 3.28084, fromUnit: "m", toUnit: "ft" },
  draft: { factor: 3.28084, fromUnit: "m", toUnit: "ft" },
  fuelCapacity: { factor: 0.264172, fromUnit: "L", toUnit: "gal" },
  waterCapacity: { factor: 0.264172, fromUnit: "L", toUnit: "gal" },
  cruisingSpeed: { factor: 1, fromUnit: "knots", toUnit: "knots" },
  maxSpeed: { factor: 1, fromUnit: "knots", toUnit: "knots" },
  topSpeed: { factor: 0.621371, fromUnit: "km/h", toUnit: "mph" },
  acceleration: { factor: 1, fromUnit: "s", toUnit: "s" },
  torque: { factor: 0.737562, fromUnit: "Nm", toUnit: "lb·ft" },
};

const stripHtmlTags = (s: unknown) =>
  String(s ?? "")
   .replace(/<[^>]*>/g, "")
   .replace(/&nbsp;/g, " ")
   .replace(/&amp;/g, "&")
   .replace(/&lt;/g, "<")
   .replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"')
   .replace(/&#?\w+;/g, "")
   .trim();

const wrapWithOriginalStyle = (originalHtml: unknown, newText: string): string => {
  const html = String(originalHtml ?? "");
  const styleMatch = html.match(/<span[^>]*style="([^"]*)"[^>]*>/);
  if (styleMatch) {
    return `<span style="${styleMatch[1]}">${newText}</span>`;
  }
  return newText;
};

const extractNumber = (s: unknown): number => {
  const plain = stripHtmlTags(s).replace(/[^\d.\-]/g, "");
  return parseFloat(plain) || 0;
};

function convertSpecValue(key: string, value: string, from: "metric" | "imperial", to: "metric" | "imperial"): string {
  if (from === to) return value;
  const conv = METRIC_TO_IMPERIAL[key];
  if (!conv || conv.factor === 1) return value;

  const numMatch = value.match(/([\d.,]+)/);
  if (!numMatch) return value;

  const num = parseFloat(numMatch[1].replace(",", ""));
  if (isNaN(num)) return value;

  if (from === "metric" && to === "imperial") {
    const converted = num * conv.factor;
    const formatted = converted % 1 === 0 ? converted.toString() : converted.toFixed(1);
    return value.replace(numMatch[1], formatted).replace(conv.fromUnit, conv.toUnit);
  } else {
    const converted = num / conv.factor;
    const formatted = converted % 1 === 0 ? converted.toString() : converted.toFixed(1);
    return value.replace(numMatch[1], formatted).replace(conv.toUnit, conv.fromUnit);
  }
}

interface VehicleDetailProps {
  id: string;
}

export default function VehicleDetail({ id }: VehicleDetailProps) {
  const [, setLocation] = useLocation();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [rates, setRates] = useState<Rates>({ EUR: 1 });
  const [viewUnits, setViewUnits] = useState<"metric" | "imperial">("metric");
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const { lang, t } = useLanguage();
  usePageView();

  useEffect(() => {
    const vid = parseInt(id);
    if (isNaN(vid)) { setError(true); setLoading(false); return; }
    trackVehicleView(vid);
    fetchVehicle(vid, lang)
      .then(v => {
        setVehicle(v);
        if (v?.specs?.unitSystem) setViewUnits(v.specs.unitSystem);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });

    fetchContent(lang).then(setSiteContent).catch(() => {});

    fetch("https://api.frankfurter.dev/v1/latest?base=EUR")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.rates) setRates({ EUR: 1, ...data.rates }); })
      .catch(() => {});
  }, [id, lang]);

  const phoneNumber = siteContent.phone_number || "+41 79 000 00 00";
  const whatsappNumber = siteContent.whatsapp_number || phoneNumber;
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "");
  const cleanPhone = stripHtml(phoneNumber).replace(/\s+/g, "");
  const cleanWhatsapp = stripHtml(whatsappNumber).replace(/[\s+]/g, "");

  const allImages: string[] = vehicle
    ? (vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0
        ? vehicle.images
        : vehicle.image ? [vehicle.image] : [])
    : [];

  const specs = vehicle?.specs || {};
  const fullDescription = specs.fullDescription || "";
  const savedUnitSystem = (specs.unitSystem === "metric" || specs.unitSystem === "imperial") ? specs.unitSystem : "metric";
  const specLabels = vehicle?.category === "car" ? getCarSpecLabels(viewUnits, t) : getYachtSpecLabels(viewUnits, t);
  const priceEur = specs.pricePerDay ? extractNumber(specs.pricePerDay) : 0;
  const priceThreeDaysEur = specs.pricePerThreeDays ? extractNumber(specs.pricePerThreeDays) : 0;
  const priceMonthEur = specs.pricePerMonth ? extractNumber(specs.pricePerMonth) : 0;
  const rate = rates[currency] || 1;
  const convertedPrice = priceEur * rate;

  const availableCurrencies = ALL_CURRENCIES.filter(c => c.code === "EUR" || rates[c.code]);

  const openLightbox = useCallback((idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const handleDownloadPdf = useCallback(async () => {
    if (!vehicle) return;
    setPdfLoading(true);
    try {
      const blob = await downloadVehicleProposal(parseInt(id), lang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (vehicle.name || "proposal")
        .replace(/<[^>]*>/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-") || "proposal";
      a.download = `${safeName}-proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(t("proposal_error"));
    } finally {
      setPdfLoading(false);
    }
  }, [vehicle, id, lang, t]);

  const lightboxPrev = useCallback(() => {
    setLightboxIdx(prev => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIdx(prev => (prev + 1) % allImages.length);
  }, [allImages.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, closeLightbox, lightboxPrev, lightboxNext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[hsl(43,67%,55%)]/30 border-t-[hsl(43,67%,55%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-card">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="font-serif text-3xl text-white mb-4">{t("not_found")}</h1>
          <p className="text-white/40 mb-8">{t("listing_not_found")}</p>
          <button onClick={() => setLocation("/")} className="font-porter text-[hsl(43,67%,55%)] hover:text-[hsl(43,67%,65%)] text-sm flex items-center gap-2">
            <ArrowLeft size={16} /> {t("back_to_home")}
          </button>
        </div>
      </div>
    );
  }

  const isCar = vehicle.category === "car";
  const CategoryIcon = isCar ? CarIcon : Ship;
  const categoryLabel = isCar ? "Car" : "Yacht";
  const backPath = isCar ? "/cars" : "/yachts";

  const currencyKeys = new Set(["deposit", "extraPricePerKm"]);
  const formatSpecDisplay = (key: string, raw: unknown) => {
    const plain = stripHtmlTags(raw);
    if (currencyKeys.has(key)) {
      const num = parseFloat(plain.replace(/[^\d.\-]/g, ""));
      if (!isNaN(num)) {
        const formatted = `€ ${num.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
        return wrapWithOriginalStyle(raw, formatted);
      }
    }
    const converted = convertSpecValue(key, plain, savedUnitSystem as "metric" | "imperial", viewUnits);
    if (converted !== plain) return wrapWithOriginalStyle(raw, converted);
    return plain;
  };

  const displaySpecs = Object.entries(specLabels)
    .filter(([key]) => specs[key])
    .map(([key, label]) => ({
      key,
      label,
      value: formatSpecDisplay(key, specs[key]),
    }));

  return (
    <div className="min-h-screen bg-card text-white">
      <Navbar />

      <div className="pt-36 pb-4 px-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setLocation(backPath)}
            className="font-porter flex items-center gap-2 text-white/40 hover:text-[hsl(43,67%,55%)] transition-colors text-sm mb-6"
          >
            <ArrowLeft size={16} />
            <span className="text-[10px] uppercase tracking-[0.2em]">{t("back_to_catalog")} {categoryLabel}s</span>
          </button>
        </div>
      </div>

     <section className="px-4 pb-12">
  <div className="max-w-7xl mx-auto">
    {allImages.length > 0 && (
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <div
          className="relative h-[520px] max-h-[75vh] rounded-2xl overflow-hidden mb-4 cursor-pointer group bg-black flex items-center justify-center"
          onClick={() => openLightbox(currentImage)}
        >
          <img
            src={allImages[currentImage]}
            alt={stripHtmlTags(vehicle.name || "")}
            className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
            decoding="async"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

          <div className="absolute bottom-6 right-6 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={18} />
          </div>

          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImage((prev) => (prev - 1 + allImages.length) % allImages.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImage((prev) => (prev + 1) % allImages.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-6 left-6 z-10">
                <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/60">
                  {currentImage + 1} / {allImages.length}
                </span>
              </div>
            </>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`flex-shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentImage
                    ? "border-[hsl(43,67%,55%)] opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img
                  src={img}
                  alt={`${stripHtmlTags(vehicle.name || "")} ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    )}
  </div>
</section>

      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="lg:col-span-2"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[9px] uppercase tracking-[0.2em] text-white/60 font-light flex items-center gap-1.5">
                  <CategoryIcon size={12} />
                  {categoryLabel}
                </span>
              </div>

           <CmsContent
  as="h1"
  className="text-white mb-3 tracking-tight leading-[1.1]"
  style={{
    fontSize: "56px",
  }}
  html={vehicle.name}
/>

{vehicle.description && (
  <CmsContent
    as="div"
    className="text-[hsl(43,67%,55%)]/70 font-light mb-8 tracking-wide leading-relaxed vehicle-description font-porter"
    style={{
      fontSize: "18px",
    }}
    html={vehicle.description}
  />
)}

              {fullDescription && (
                <div className="mb-10">
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-light mb-4">Description</h2>
                  <CmsContent as="div" className="text-white/70 text-[15px] leading-relaxed font-light font-wix whitespace-pre-line vehicle-description" html={fullDescription} />
                </div>
              )}

              {displaySpecs.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-light">Specifications</h2>
                    <div className="flex bg-white/[0.04] rounded-lg overflow-hidden border border-white/[0.06]">
                      <button
                        onClick={() => setViewUnits("metric")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] transition-colors ${
                          viewUnits === "metric"
                            ? "bg-[hsl(43,67%,55%)]/15 text-[hsl(43,67%,55%)]"
                            : "text-white/30 hover:text-white/50"
                        }`}
                      >
                        Metric
                      </button>
                      <button
                        onClick={() => setViewUnits("imperial")}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] transition-colors ${
                          viewUnits === "imperial"
                            ? "bg-[hsl(43,67%,55%)]/15 text-[hsl(43,67%,55%)]"
                            : "text-white/30 hover:text-white/50"
                        }`}
                      >
                        Imperial
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
                    {displaySpecs.map(({ key, label, value }) => (
                      <div key={key} className="bg-card p-5">
                        <p className="spec-label mb-2">{label}</p>
<CmsContent as="p" className="spec-value" html={value} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="lg:col-span-1"
            >
              <div className="sticky top-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8">
                {priceEur > 0 ? (
                  <div className="mb-6">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-light mb-2">Charter Rate</p>
                    <div className="flex items-baseline gap-2">
                      <CmsContent
  as="span"
  className="text-[hsl(43,67%,55%)] vehicle-price"
  html={wrapWithOriginalStyle(
    specs.pricePerDay,
    formatPrice(convertedPrice, currency)
  )}
/>
                      <span className="text-white/25 text-sm">/ day</span>
                    </div>

                    {isCar && priceThreeDaysEur > 0 && (
                      <div className="flex items-baseline gap-2 mt-2">
                        <CmsContent
                          as="span"
                          className="text-[hsl(43,67%,55%)] vehicle-price"
                          html={wrapWithOriginalStyle(
                            specs.pricePerThreeDays,
                            formatPrice(priceThreeDaysEur * rate, currency)
                          )}
                        />
                        <span className="text-white/25 text-sm">/ 3 days</span>
                      </div>
                    )}
                    {isCar && priceMonthEur > 0 && (
                      <div className="flex items-baseline gap-2 mt-2">
                        <CmsContent
                          as="span"
                          className="text-[hsl(43,67%,55%)] vehicle-price"
                          html={wrapWithOriginalStyle(
                            specs.pricePerMonth,
                            formatPrice(priceMonthEur * rate, currency)
                          )}
                        />
                        <span className="text-white/25 text-sm">/ month</span>
                      </div>
                    )}

                    {vehicle?.category === "yacht" && priceEur > 0 && (
                      <div className="flex items-baseline gap-2 mt-2">
                        <CmsContent
  as="span"
  className="text-[hsl(43,67%,55%)] vehicle-price"
  html={wrapWithOriginalStyle(
    specs.pricePerDay,
    formatPrice(Math.round(priceEur * 6) * rate, currency)
  )}
/>
                        <span className="text-white/25 text-sm">/ week</span>
                      </div>
                    )}

                    {vehicle?.category === "yacht" && specs.pricingType && (
                      <div className="mt-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.15em] font-medium border ${
                          specs.pricingType === "plus APA"
                            ? "bg-amber-500/10 text-amber-400/80 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20"
                        }`}>
                          {specs.pricingType === "plus APA" ? "+ APA" : "All Included"}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {availableCurrencies.map(c => (
                        <button
                          key={c.code}
                          onClick={() => setCurrency(c.code)}
                          className={`px-2.5 py-1 rounded text-[9px] uppercase tracking-[0.1em] transition-all ${
                            currency === c.code
                              ? "bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)] border border-[hsl(43,67%,55%)]/30"
                              : "bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/60"
                          }`}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-light mb-2">{t("charter_rate")}</p>
                    <p className="text-[hsl(43,67%,55%)]/70 text-xl font-serif">{t("on_request")}</p>
                  </div>
                )}

                <div className="border-t border-white/[0.06] pt-6 space-y-3">
                  <button
                    onClick={() => {
                      setLocation("/");
                      setTimeout(() => {
                        const el = document.getElementById("request");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 400);
                    }}
                    className="w-full bg-[hsl(43,67%,55%)] text-black py-3.5 rounded-lg text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,65%)] transition-colors"
                  >
                    {t("request_this")} {categoryLabel}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex items-center justify-center gap-2 py-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:border-[hsl(43,67%,55%)]/30 hover:bg-[hsl(43,67%,55%)]/10 transition-all text-[10px] uppercase tracking-[0.15em] font-light"
                    >
                      <Phone size={14} />
                      {t("call")}
                    </a>
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`${t("interested_in")} ${(vehicle?.name || "").replace(/<[^>]*>/g, "")}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 rounded-lg border border-green-600/20 bg-green-600/5 text-green-400/60 hover:text-green-300 hover:bg-green-600/15 transition-all text-[10px] uppercase tracking-[0.15em] font-light"
                    >
                      <MessageCircle size={14} />
                      {t("whatsapp")}
                    </a>
                  </div>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] uppercase tracking-[0.15em] font-light"
                  >
                    {pdfLoading
                      ? <><Loader2 size={14} className="animate-spin" /> {t("generating")}</>
                      : <><FileDown size={14} /> {t("download_proposal")}</>
                    }
                  </button>

                  <p className="text-white/20 text-[10px] text-center mt-1 font-light">
                    {t("concierge_response")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="bg-black relative z-10 overflow-hidden">
        <div className="gold-line w-full opacity-30" />
        <div className="pt-16 pb-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="border-t border-white/[0.05] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase font-light">
                &copy; {new Date().getFullYear()} TRANSYACHTGROUP. {t("rights_reserved")}
              </p>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
            >
              <X size={20} />
            </button>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-white/40 text-sm">
              {lightboxIdx + 1} / {allImages.length}
            </div>

            <img
              src={allImages[lightboxIdx]}
              alt={vehicle.name}
              className="max-w-[90vw] max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
