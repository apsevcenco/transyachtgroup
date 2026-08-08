import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "@/lib/motion-shim";
import { Menu, X, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const desktopLangRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopLangRef.current?.contains(target);
      const insideMobile = mobileLangRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: t("yachts"), href: "/yachts" },
    { name: t("cars"), href: "/cars" },
    { name: t("about_us"), href: "/about" },
    { name: "Guides", href: "/guides/" },
    { name: t("contact"), href: "/#request", hash: "request" },
  ];

  const scrollToHash = useCallback((hash: string) => {
    const scrollToEl = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };
    if (!scrollToEl()) {
      setTimeout(scrollToEl, 300);
    }
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent, link: { href: string; hash?: string }) => {
      e.preventDefault();
      if (link.hash) {
        const currentPath = window.location.pathname.replace(/\/$/, "");
        if (currentPath === "" || currentPath === "/") {
          scrollToHash(link.hash);
        } else {
          setLocation("/");
          setTimeout(() => scrollToHash(link.hash!), 400);
        }
      } else {
        setLocation(link.href);
        window.scrollTo(0, 0);
      }
    },
    [setLocation, scrollToHash],
  );

  const currentLang = LANGUAGES.find((l) => l.code === lang)!;

  const handleLangSelect = (code: typeof lang) => {
    setLang(code);
    setLangMenuOpen(false);
  };

  const languageHref = (code: typeof lang) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", code);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const langDropdown = (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-full right-0 mt-2 bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden min-w-[160px] shadow-2xl z-[60]"
    >
      {LANGUAGES.map((l) => (
        <a
          key={l.code}
          href={languageHref(l.code)}
          hrefLang={l.code}
          lang={l.code}
          onClick={(event) => {
            event.preventDefault();
            handleLangSelect(l.code);
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-[11px] tracking-wide transition-all font-porter ${
            lang === l.code
              ? "bg-[hsl(43,67%,55%)]/10 text-[hsl(43,67%,55%)]"
              : "text-white/50 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span className="text-base">{l.flag}</span>
          <span>{l.label}</span>
        </a>
      ))}
    </motion.div>
  );

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 overflow-visible ${
        isScrolled
          ? "bg-[#0a0a0a]/95 md:bg-background/80 md:backdrop-blur-2xl border-b border-white/[0.04]"
          : "bg-transparent"
      }`}
    >
      <div className="w-full px-4 sm:px-6 py-8 flex justify-between items-center">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setLocation("/");
            window.scrollTo(0, 0);
          }}
          className="flex items-center group ml-4 overflow-visible"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/logo-transparent.png`}
            alt="TRANSYACHTGROUP"
            className="h-[60px] w-auto object-contain transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(212,168,67,0.3)]"
          />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="font-porter text-[13px] uppercase tracking-[0.25em] text-white/70 hover:text-gold transition-all duration-500 font-medium relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[1px] after:bg-gold/60 hover:after:w-full after:transition-all after:duration-500 cursor-pointer"
            >
              {link.name}
            </a>
          ))}

          <div className="relative" ref={desktopLangRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="font-porter flex items-center gap-1.5 text-[13px] uppercase tracking-[0.2em] text-white/70 hover:text-gold transition-all duration-500 font-medium px-2 py-1 rounded-md border border-transparent hover:border-white/[0.08]"
            >
              <Globe size={15} />
              <span>{currentLang.flag}</span>
              <span>{lang.toUpperCase()}</span>
            </button>

            {langMenuOpen && langDropdown}
          </div>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <div className="relative" ref={mobileLangRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 text-white/60 hover:text-gold transition-colors p-1"
            >
              <span className="text-base">{currentLang.flag}</span>
            </button>

            {langMenuOpen && langDropdown}
          </div>

          <button
            className="text-white/80 hover:text-gold transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="md:hidden fixed top-0 right-0 h-screen w-[78%] max-w-[320px] bg-[#0a0a0a] border-l border-white/[0.08] z-[60] flex flex-col pt-28 px-8 gap-8 shadow-2xl"
            >
              <button
                className="absolute top-8 right-6 text-white/60 hover:text-gold transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={22} />
              </button>

              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    handleNavClick(e, link);
                  }}
                  className="font-porter text-lg uppercase tracking-widest text-white hover:text-gold transition-colors duration-300"
                >
                  {link.name}
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
