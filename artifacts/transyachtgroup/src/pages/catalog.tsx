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
    (c) => c.code === "EUR" || rates[c.code] !== undefined
  );

  const convertPrice = useCallback(
    (eurPrice: number): number => {
      if (currency === "EUR") return eurPrice;
      const rate = rates[currency];
      if (!rate) return eurPrice;
      return eurPrice * rate;
    },
    [currency, rates]
  );

  const displayCurrency = rates[currency] !== undefined ? currency : "EUR";
  const items = allCollection.filter((item) => item.category === category);
  const [visibleCount, setVisibleCount] = useState(12);
const visibleItems = items.slice(0, visibleCount);
const hasMoreItems = visibleCount < items.length;

  const isYacht = category === "yacht";

  const title = isYacht
    ? siteContent.yacht_section_title || "Ocean Prestige"
    : siteContent.car_section_title || "Road Sovereign";

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

  const titleSize = isYacht
    ? getFontSize(siteContent.yacht_section_title_size, "72px")
    : getFontSize(siteContent.car_section_title_size, "72px");

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
              html={title}
              className="font-serif text-white mb-6 tracking-tight leading-none"
              style={{ fontSize: titleSize }}
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
  const { t } = useLanguage();
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

  const goToDetail = () => setLocation(`/vehicle/${item.id}`);

  const phoneNumber = siteContent.phone_number || "";
  const whatsappNumber = siteContent.whatsapp_number || phoneNumber;
  const cleanPhone = stripHtml(phoneNumber).replace(/\s+/g, "");
  const cleanWhatsapp = stripHtml(whatsappNumber).replace(/[\s+]/g, "");

  return (
    <motion.div
      variants={fadeInUp}
      className="group bg-card/50 rounded-xl overflow-hidden border border-white/[0.04] hover-glow-gold flex flex-col h-full cursor-pointer"
      onClick={goToDetail}
    >
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
          className="font-porter text-xl text-white mb-1 tracking-tight"
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
    specs.pricePerDay
  )}
/>
                <span className="text-white/25 text-[10px] ml-1">
                  {t("per_day")}
                </span>
              </div>

              {item.category === "car" && extractNum(specs.pricePerThreeDays) > 0 && (
                <div className="mt-0.5">
                  <CmsContent
                    as="span"
                    className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                    html={withOriginalStyle(
                      formatPrice(convertPrice(extractNum(specs.pricePerThreeDays)), displayCurrency),
                      specs.pricePerThreeDays
                    )}
                  />
                  <span className="text-white/25 text-[10px] ml-1">/ 3 days</span>
                </div>
              )}
              {item.category === "car" && extractNum(specs.pricePerMonth) > 0 && (
                <div className="mt-0.5">
                  <CmsContent
                    as="span"
                    className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
                    html={withOriginalStyle(
                      formatPrice(convertPrice(extractNum(specs.pricePerMonth)), displayCurrency),
                      specs.pricePerMonth
                    )}
                  />
                  <span className="text-white/25 text-[10px] ml-1">/ month</span>
                </div>
              )}

              {item.category === "yacht" && priceEur > 0 && (
                <div className="mt-0.5">
                  <CmsContent
  as="span"
  className="text-[hsl(43,67%,55%)] font-medium tracking-wide vehicle-price"
  html={withOriginalStyle(
    formatPrice(convertPrice(Math.round(priceEur * 6)), displayCurrency),
    specs.pricePerDay
  )}
/>
                  <span className="text-white/25 text-[10px] ml-1">
                    / week
                  </span>

                  {specs.pricingType && (
                    <span
                      className={`ml-1.5 text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full border ${
                        specs.pricingType === "plus APA"
                          ? "text-amber-400/70 border-amber-500/15 bg-amber-500/5"
                          : "text-emerald-400/70 border-emerald-500/15 bg-emerald-500/5"
                      }`}
                    >
                      {specs.pricingType === "plus APA"
                        ? "+ APA"
                        : "All incl."}
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
                  `${t("interested_in")} ${stripHtml(item.name || "")}`
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
