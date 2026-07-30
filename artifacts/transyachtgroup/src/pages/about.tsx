import { useState, useEffect } from "react";
import type { Variants } from "framer-motion";
import { motion } from "@/lib/motion-shim";
import { Navbar } from "@/components/Navbar";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { fetchContent } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageView } from "@/hooks/useAnalytics";
import { CmsContent } from "@/components/CmsContent";

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#?\w+;/g, "")
    .trim();

const DEFAULT_SLOGAN = "The Art of\nExtraordinary Mobility";
const DEFAULT_TEXT = `TRANSYACHTGROUP was founded on a singular belief: that true luxury is not merely possessed — it is experienced. We are a private concierge house specializing in the curation of the world's finest superyachts and hypercars for those who accept nothing less than perfection.

Our journey began in the heart of the Mediterranean, where a passion for maritime excellence and automotive artistry converged into a vision — to create a seamless bridge between the world's most extraordinary vessels and vehicles and the discerning individuals who deserve them.

Today, we serve a private circle of clients across Europe, the Middle East, and Asia, delivering bespoke charter and rental experiences that transcend expectations. Every engagement is personal. Every detail, considered.`;

export default function About() {
  const [, setLocation] = useLocation();
  const [content, setContent] = useState<Record<string, string>>({});
  const { lang, t } = useLanguage();
  usePageView();

  useEffect(() => {
    fetchContent(lang)
      .then(setContent)
      .catch(() => {});
  }, [lang]);

  const aboutTitle = content.about_title || "About Us";
  const slogan = content.about_slogan || DEFAULT_SLOGAN;
  const text = content.about_text || DEFAULT_TEXT;
  const aboutBackground =
    (content.about_background || "").trim() ||
    `${import.meta.env.BASE_URL}images/hero-bg.jpg`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <section className="min-h-[calc(100vh-64px)] flex items-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="hidden md:block absolute top-1/4 left-0 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[200px]"
            style={{ animation: "glow-pulse 10s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold-dark/[0.03] rounded-full blur-[200px]"
            style={{ animation: "glow-pulse 14s ease-in-out infinite 3s" }}
          />
        </div>

        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInLeft}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-[3/4]">
                <img
                  src={aboutBackground}
                  alt={strip(aboutTitle)}
                  className="w-full h-full object-cover about-hero-img"
                  style={{
                    objectPosition: "50% 50%",
                  }}
                />
                <div className="absolute inset-0 about-hero-gradient-top" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/60" />
                <div className="absolute inset-0 pointer-events-none about-hero-blur" />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12">
                  <div className="w-[50px] h-[1px] bg-gold/40 mb-6" />
                  <CmsContent
                    as="h1"
                    className="font-antro text-[2.4rem] md:text-[3rem] lg:text-[3.5rem] xl:text-[4rem] text-gold leading-[1.15] text-center whitespace-pre-line"
                    html={slogan}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInRight}
              className="flex flex-col justify-center pt-2 lg:pt-16"
            >
              <div className="mb-6">
                <p className="text-[9px] uppercase tracking-[0.5em] text-gold/50 mb-3 font-light">
                  —
                </p>
                <CmsContent
                  as="h2"
                  className="font-serif text-2xl md:text-3xl text-white mb-2 tracking-tight"
                  html={aboutTitle}
                />
                <div className="w-[40px] h-[1px] bg-gold/30 mt-3" />
              </div>
              <div className="mb-10">
                <CmsContent
                  as="div"
                  className="text-white/55 font-light font-wix leading-[1.65] text-[15px] md:text-[16px] space-y-5"
                  html={text}
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setLocation("/#request");
                  }}
                  className="inline-flex items-center gap-2 bg-[hsl(43,67%,55%)] text-black px-7 py-3.5 rounded-lg text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,65%)] transition-colors"
                >
                  {t("contact_us")} <ChevronRight size={14} />
                </button>
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
                &copy; {new Date().getFullYear()} TRANSYACHTGROUP.{" "}
                {t("rights_reserved")}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
