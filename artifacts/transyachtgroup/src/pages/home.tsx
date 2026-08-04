import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "@/lib/motion-shim";
import { Ship, Car, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { useLocation } from "wouter";
import { fetchFeaturedVehicles, fetchContent, submitRequest } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageView, trackFormSubmit } from "@/hooks/useAnalytics";
import { CmsContent } from "@/components/CmsContent";

function GrainOverlay() {
  return (
    <div
      className="hidden md:block pointer-events-none fixed inset-0 z-[100] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gold/30"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${Math.random() * 4 + 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
        />
      ))}
    </div>
  );
}

type VehicleItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string;
  featured: boolean | null;
};

function stripCmsText(value?: string) {
  if (!value) return "";

  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .trim();
}
export default function Home() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { lang, t } = useLanguage();
  usePageView();

  const { data: collection = [] } = useQuery<VehicleItem[]>({
    queryKey: ["vehicles", "featured", lang],
    queryFn: () =>
      fetchFeaturedVehicles(lang).then((v) => (Array.isArray(v) ? v : [])),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: siteContent = {} } = useQuery<Record<string, string>>({
    queryKey: ["content", lang],
    queryFn: () => fetchContent(lang),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const contentBackground = (key: string, fallback: string): string =>
    Object.prototype.hasOwnProperty.call(siteContent, key)
      ? (siteContent[key] || "").trim()
      : fallback;
  const heroBackground = contentBackground(
    "hero_background",
    `${import.meta.env.BASE_URL}images/hero-bg.jpg`,
  );
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    try {
      const result = await submitRequest({
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: (formData.get("phone") as string) || undefined,
        interest: (formData.get("interest") as string) || undefined,
        message: formData.get("message") as string,
      });

      trackFormSubmit("contact");
      toast({
        title: t("request_received"),
        description: t("request_success"),
        className: "bg-card border-gold text-gold",
      });
      form.reset();
    } catch {
      toast({
        title: t("error"),
        description: t("request_error"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <GrainOverlay />
      <Navbar />

      {/* HERO */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0 z-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="hero-bg-mask relative w-[95vw] h-[95vh] md:w-[90vw] md:h-[82vh] max-w-[1300px] max-h-[850px]">
              {heroBackground ? (
                <img
                  src={heroBackground}
                  alt=""
                  className="w-full h-full object-cover"
                  {...({ fetchpriority: "high" } as any)}
                  decoding="async"
                  style={{ objectPosition: "50% 50%" }}
                />
              ) : null}
            </div>
          </div>
          <div
            className="hidden md:block absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gold/[0.07] rounded-full blur-[180px]"
            style={{ animation: "glow-pulse 8s ease-in-out infinite" }}
          />
          <div
            className="hidden md:block absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-gold-dark/[0.05] rounded-full blur-[200px]"
            style={{ animation: "glow-pulse 12s ease-in-out infinite 2s" }}
          />
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gold/[0.03] rounded-full blur-[100px] rotate-12" />
        </motion.div>

        <div className="hidden md:block">
          <GoldParticles />
        </div>

        <div className="relative z-20 text-center px-4 max-w-6xl mx-auto mt-24 md:mt-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1.4,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="gold-line w-32 mx-auto mb-10"
            />

            <CmsContent
              as="h1"
              className="font-antro text-[2.8rem] md:text-[3.75rem] lg:text-[4.5rem] xl:text-[5rem] text-gradient-gold leading-[1] pt-4 mb-16 drop-shadow-[0_0_60px_rgba(212,168,67,0.15)] whitespace-pre-line"
              html={siteContent.hero_title || "The Art of Unlimited\nMobility"}
            />

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="gold-line w-16" />
              <div className="gold-dot" />
              <div className="gold-line w-16" />
            </div>

            <CmsContent
              as="p"
              className="font-porter text-[11px] md:text-xs text-white/50 uppercase tracking-[0.4em] mb-3 max-w-2xl mx-auto font-light"
              html={
                siteContent.hero_tagline ||
                "Exquisite Cars \u00b7 Superyachts \u00b7 Pure Luxury"
              }
            />
            <CmsContent
              as="p"
              className="font-serif text-sm md:text-base text-white/30 italic tracking-wide max-w-lg mx-auto mb-14"
              html={
                siteContent.hero_subtitle ||
                "Where ocean meets asphalt. Where movement becomes art."
              }
            />
          </motion.div>
        </div>
      </section>

      {/* CATEGORY SPLIT */}
      <section id="categories" className="w-full bg-background relative z-10">
        <div className="gold-line w-full opacity-40" />
        <div className="flex flex-col md:flex-row min-h-[70vh]">
          {[
            {
              id: "yachts",
              icon: Ship,
              title: siteContent.yacht_section_title || "Ocean Prestige",
              subtitle:
                siteContent.yacht_section_subtitle || "Superyacht Collection",
              desc:
                siteContent.yacht_section_desc ||
                "Curated fleet of exceptional superyachts, delivering unparalleled privacy and luxury on the open water.",
              link: t("view_collection"),
              route: "/yachts",
              bg: contentBackground(
                "yacht_section_bg",
                `${import.meta.env.BASE_URL}images/hero-bg.jpg`,
              ),
              borderClass:
                "border-b md:border-b-0 md:border-r border-white/[0.04]",
            },
            {
              id: "cars",
              icon: Car,
              title: siteContent.car_section_title || "Road Sovereign",
              subtitle: siteContent.car_section_subtitle || "Elite Automotive",
              desc:
                siteContent.car_section_desc ||
                "Elite automotive experiences without limits. Access the world's most sought-after hypercars and luxury vehicles.",
              link: t("view_collection"),
              route: "/cars",
              bg: contentBackground(
                "car_section_bg",
                `${import.meta.env.BASE_URL}images/hero-bg.jpg`,
              ),
              borderClass: "",
            },
          ].map((cat) => (
            <div
              key={cat.id}
              id={cat.id}
              className={`flex-1 relative group overflow-hidden cursor-pointer ${cat.borderClass}`}
              onClick={() => {
                setLocation(cat.route);
                window.scrollTo(0, 0);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent z-10" />
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35 group-hover:scale-110 group-hover:opacity-45 transition-all duration-[1.5s] ease-out"
                style={{
                  backgroundImage: cat.bg ? `url('${cat.bg}')` : "none",
                }}
              />

              <div className="relative z-20 h-full flex flex-col items-center justify-center text-center p-12 lg:p-28 min-h-[50vh]">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={fadeInUp}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-full border border-gold/20 flex items-center justify-center mb-10 group-hover:border-gold/50 group-hover:shadow-[0_0_40px_rgba(212,168,67,0.15)] transition-all duration-700">
                    <cat.icon className="text-gold/70 w-9 h-9 group-hover:text-gold transition-colors duration-500" />
                  </div>
                  <CmsContent
                    as="div"
                    className="uppercase tracking-[0.4em] text-gold/50 mb-4 font-light"
                    html={cat.subtitle}
                  />

                  <CmsContent
                    as="div"
                    className="text-white mb-5 tracking-tight leading-[1.05]"
                    html={cat.title}
                  />

                  <CmsContent
                    as="div"
                    className="text-white/40 font-light tracking-wide max-w-md mb-10 leading-relaxed"
                    html={cat.desc}
                  />
                  <span className="inline-flex items-center text-gold/80 uppercase tracking-[0.3em] text-[11px] font-medium hover:text-gold transition-all duration-500 group/link">
                    {cat.link}{" "}
                    <ChevronRight className="w-4 h-4 ml-2 group-hover/link:translate-x-2 transition-transform duration-500" />
                  </span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COLLECTION */}
      {collection.length > 0 && (
        <section
          id="collection"
          className="py-28 md:py-40 px-4 max-w-7xl mx-auto relative z-10"
        >
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.02] rounded-full blur-[150px] pointer-events-none" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <CmsContent
              as="p"
              className="text-[10px] uppercase tracking-[0.5em] text-gold/50 mb-5 font-light"
              html={siteContent.collection_subtitle || "Curated Selection"}
            />
            <CmsContent
              as="h2"
              className="font-serif text-4xl md:text-6xl text-white mb-6 tracking-tight"
              html={siteContent.collection_title || "The Collection"}
            />
            <div className="flex items-center justify-center gap-3">
              <div className="gold-line w-20" />
              <div className="gold-dot" />
              <div className="gold-line w-20" />
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {collection.map((item) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                className="relative group bg-card/50 rounded-xl overflow-hidden border border-white/[0.04] hover-glow-gold flex flex-col h-full cursor-pointer"
                onClick={() => setLocation(`/vehicle/${item.id}`)}
              >
                <a
                  href={`/vehicle/${item.id}?lang=${lang}`}
                  aria-label={`${t("view_details")}: ${stripCmsText(item.name)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setLocation(`/vehicle/${item.id}`);
                  }}
                  className="absolute inset-0 z-[11]"
                />
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent z-10 opacity-80" />
                  <img
                    src={item.image}
                    alt={stripCmsText(item.name)}
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1.5 bg-black/70 backdrop-blur-xl border border-white/[0.06] rounded-full text-[9px] uppercase tracking-[0.2em] text-white/70 font-light">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <CmsContent
                    as="h3"
                    className="font-porter text-lg text-white mb-1 tracking-tight"
                    html={item.name || ""}
                  />
                  <CmsContent
                    as="p"
                    className="text-white/35 text-sm mb-4 font-light font-porter vehicle-description"
                    html={item.description || ""}
                  />
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.04]">
                    {(() => {
                      const sp = (item as any).specs || {};
                      const extractN = (v: unknown) =>
                        parseFloat(
                          String(v || "")
                            .replace(/<[^>]*>/g, "")
                            .replace(/[^\d.\-]/g, ""),
                        ) || 0;
                      const getInlineStyle = (v: unknown) =>
                        String(v || "").match(
                          /<span[^>]*style="([^"]*)"[^>]*>/i,
                        )?.[1] || "";
                      const withOriginalStyle = (
                        text: string,
                        original: unknown,
                      ) => {
                        const style = getInlineStyle(original);
                        return style
                          ? `<span style="${style}">${text}</span>`
                          : text;
                      };
                      const pDay = extractN(sp.pricePerDay);
                      const p3d = extractN(sp.pricePerThreeDays);
                      const pMo = extractN(sp.pricePerMonth);
                      if (pDay <= 0 && p3d <= 0 && pMo <= 0) return null;
                      const fmt = (n: number) =>
                        "€ " + Math.round(n).toLocaleString("en-US");
                      return (
                        <div>
                          {pDay > 0 && (
                            <div>
                              <CmsContent
                                as="span"
                                className="text-[hsl(43,67%,55%)] font-medium tracking-wide text-sm vehicle-price"
                                html={withOriginalStyle(
                                  fmt(pDay),
                                  sp.pricePerDay,
                                )}
                              />
                              <span className="text-white/25 text-[10px] ml-1">
                                {t("per_day")}
                              </span>
                            </div>
                          )}
                          {p3d > 0 && (
                            <div className="mt-0.5">
                              <CmsContent
                                as="span"
                                className="text-[hsl(43,67%,55%)] font-medium tracking-wide text-sm vehicle-price"
                                html={withOriginalStyle(
                                  fmt(p3d),
                                  sp.pricePerThreeDays,
                                )}
                              />
                              <span className="text-white/25 text-[10px] ml-1">
                                / 3 days
                              </span>
                            </div>
                          )}
                          {pMo > 0 && (
                            <div className="mt-0.5">
                              <CmsContent
                                as="span"
                                className="text-[hsl(43,67%,55%)] font-medium tracking-wide text-sm vehicle-price"
                                html={withOriginalStyle(
                                  fmt(pMo),
                                  sp.pricePerMonth,
                                )}
                              />
                              <span className="text-white/25 text-[10px] ml-1">
                                / month
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {!(() => {
                      const sp = (item as any).specs || {};
                      const e = (v: unknown) =>
                        parseFloat(
                          String(v || "")
                            .replace(/<[^>]*>/g, "")
                            .replace(/[^\d.\-]/g, ""),
                        ) || 0;
                      return (
                        e(sp.pricePerDay) > 0 ||
                        e(sp.pricePerThreeDays) > 0 ||
                        e(sp.pricePerMonth) > 0
                      );
                    })() && (
                      <span className="text-gold/60 text-[11px] tracking-[0.15em] uppercase font-light">
                        {t("view_details")}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-gold group-hover:text-black group-hover:border-gold transition-all duration-500">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* OFFICE LOCATION */}
      <section
        id="location"
        className="py-28 px-4 bg-black relative z-10 overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 gold-line opacity-20" />
          <div className="hidden md:block absolute top-1/4 left-0 w-[500px] h-[500px] bg-gold/[0.03] rounded-full blur-[200px]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <p className="text-[10px] uppercase tracking-[0.5em] text-gold/50 mb-5 font-light">
              Côte d'Azur · France
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-8 tracking-tight">
              {t("our_location")}
            </h2>
            <div className="flex items-center gap-3 mb-10">
              <div className="gold-line w-16" />
              <div className="gold-dot" />
            </div>
            <div className="flex items-start gap-3 mb-10">
              <MapPin size={14} className="text-gold/50 mt-1 shrink-0" />
              <address className="not-italic text-white/50 font-light text-sm leading-loose">
                <div className="text-white/70">Quai Napoleon, Local B15</div>
                <div>Port Camille Rayon</div>
                <div>06220 Golfe-Juan</div>
                <div>France</div>
              </address>
            </div>
            {(() => {
              let photos: string[] = [];
              try {
                photos = JSON.parse(siteContent.office_photos || "[]");
              } catch {}
              return photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mb-8">
                  {photos.slice(0, 3).map((url, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] overflow-hidden rounded-lg border border-white/[0.05]"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover transition-all duration-700"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
            <a
              href="https://www.google.com/maps?q=43.5647,7.0892"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-gold/60 hover:text-gold text-[11px] uppercase tracking-[0.3em] font-light transition-colors duration-300"
            >
              Open in Google Maps <ChevronRight size={12} className="ml-1" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 1,
              ease: [0.25, 0.46, 0.45, 0.94] as const,
            }}
          >
            <div className="rounded-xl overflow-hidden border border-white/[0.06] w-full aspect-[4/3]">
              <iframe
                src="https://maps.google.com/maps?q=Quai+Napoleon+Local+B15+Port+Camille+Rayon+06220+Golfe-Juan+France&z=15&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                title="TransYachtGroup Office Location"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section
        id="request"
        className="py-28 px-4 bg-black relative z-10 overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 gold-line opacity-20" />
          <div className="hidden md:block absolute top-1/4 right-0 w-[500px] h-[500px] bg-gold/[0.03] rounded-full blur-[200px]" />
          <div className="hidden md:block absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-gold-dark/[0.02] rounded-full blur-[180px]" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <CmsContent
              as="p"
              className="text-[10px] uppercase tracking-[0.5em] text-gold/50 mb-5 font-light"
              html={siteContent.form_subtitle || "Private Concierge"}
            />
            <CmsContent
              as="h2"
              className="font-serif text-4xl md:text-6xl text-white mb-8 tracking-tight leading-[1.1] whitespace-pre-line"
              html={siteContent.form_title || "Initiate Your\nRequest"}
            />

            <CmsContent
              as="div"
              className="text-white/40 mb-12 font-light font-wix text-base leading-relaxed max-w-lg"
              html={
                siteContent.form_desc ||
                "Contact our concierge team to orchestrate your next journey. We respond with utmost discretion within 2 hours."
              }
            />

            <div className="space-y-5 mb-12">
              {[
                t("dedicated_concierge"),
                t("worldwide_delivery"),
                t("absolute_privacy"),
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 text-white/60"
                >
                  <div className="w-5 h-5 rounded-full border border-gold/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  </div>
                  <span className="font-light text-sm tracking-wide">
                    {text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="glass-panel p-8 md:p-10 rounded-2xl relative gold-shimmer-border"
          >
            <form
              onSubmit={handleRequestSubmit}
              className="space-y-5 relative z-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label
                    htmlFor="firstName"
                    className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                  >
                    {t("first_name")}
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    placeholder="John"
                    className="bg-black/40 border-white/[0.06] focus:border-gold/30 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="lastName"
                    className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                  >
                    {t("last_name")}
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    placeholder="Doe"
                    className="bg-black/40 border-white/[0.06] focus:border-gold/30 h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                  >
                    {t("email")}
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="bg-black/40 border-white/[0.06] focus:border-gold/30 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                  >
                    {t("phone")}
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="bg-black/40 border-white/[0.06] focus:border-gold/30 h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="interest"
                  className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                >
                  {t("interest")}
                </label>
                <select
                  id="interest"
                  name="interest"
                  defaultValue=""
                  className="flex h-12 w-full rounded-md border border-white/[0.06] bg-black/40 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/30 focus-visible:border-gold/30 transition-all appearance-none"
                >
                  <option value="" disabled>
                    {t("select_category")}
                  </option>
                  <option value="yacht">{t("yacht_charter")}</option>
                  <option value="car">{t("car_rental")}</option>
                  <option value="both">{t("combined")}</option>
                  <option value="private">{t("off_market")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="message"
                  className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light"
                >
                  {t("request_details")}
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  placeholder={t("request_placeholder")}
                  className="bg-black/40 border-white/[0.06] focus:border-gold/30"
                />
              </div>
              <Button
                type="submit"
                variant="gold"
                className="w-full h-14 text-[11px] uppercase tracking-[0.25em] font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("processing") : t("submit_request")}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black relative z-10 overflow-hidden">
        <div className="gold-line w-full opacity-30" />
        <div className="pt-20 pb-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
              <div className="max-w-sm">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-transparent.png`}
                  alt="TRANSYACHTGROUP"
                  className="h-10 w-auto mb-5 opacity-70"
                />
                <CmsContent
                  as="div"
                  className="text-white/25 text-sm leading-relaxed mb-6 font-light font-wix tracking-wide"
                  html={
                    siteContent.footer_desc ||
                    "TRANSYACHTGROUP redefines luxury mobility. We curate the world's most exceptional superyachts and elite vehicles for discerning clientele globally."
                  }
                />
              </div>

              <div className="flex gap-16 flex-wrap">
                <div>
                  <h4 className="text-gold/60 font-serif text-base mb-6 tracking-wide">
                    {t("collections")}
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href={`/yachts?lang=${lang}`}
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {stripCmsText(siteContent.yacht_section_title) ||
                          "Ocean Prestige"}
                      </a>
                    </li>

                    <li>
                      <a
                        href={`/cars?lang=${lang}`}
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {stripCmsText(siteContent.car_section_title) ||
                          "Road Sovereign"}
                      </a>
                    </li>
                    <li>
                      <a
                        href={`/about?lang=${lang}`}
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {t("off_market")}
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-gold/60 font-serif text-base mb-6 tracking-wide">
                    {t("company")}
                  </h4>
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="#"
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {t("about_us")}
                      </a>
                    </li>

                    <li>
                      <a
                        href="#"
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {t("concierge")}
                      </a>
                    </li>

                    <li>
                      <a
                        href="#request"
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        {t("contact")}
                      </a>
                    </li>

                    <li>
                      <a
                        href={`/privacy?lang=${lang}`}
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        Privacy Policy
                      </a>
                    </li>

                    <li>
                      <a
                        href={`/legal?lang=${lang}`}
                        className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                      >
                        Legal Notice
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-gold/60 font-serif text-base mb-6 tracking-wide">
                    French Riviera
                  </h4>
                  <ul className="space-y-3">
                    {[
                      ["cannes", "Cannes"],
                      ["monaco", "Monaco"],
                      ["nice", "Nice"],
                      ["antibes", "Antibes"],
                      ["saint-tropez", "Saint-Tropez"],
                    ].map(([slug, city]) => (
                      <li key={slug}>
                        <a
                          href={`/locations/${slug}?lang=${lang}`}
                          className="text-white/30 hover:text-gold/80 text-sm transition-all duration-500 font-light tracking-wide"
                        >
                          {city}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

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
