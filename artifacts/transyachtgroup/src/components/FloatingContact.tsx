import { useState, useEffect } from "react";
import { Phone, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motion-shim";
import { fetchContent } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export function FloatingContact() {
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    fetchContent(lang).then(setSiteContent).catch(() => {});
  }, [lang]);

  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "");
  const phoneNumber = siteContent.phone_number || "+41 79 000 00 00";
  const whatsappNumber = siteContent.whatsapp_number || phoneNumber;
  const cleanPhone = stripHtml(phoneNumber).replace(/\s+/g, "");
  const cleanWhatsapp = stripHtml(whatsappNumber).replace(/[\s+]/g, "");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.a
              key="phone"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#111]/95 md:backdrop-blur-xl border border-white/[0.08] text-white/70 hover:text-white hover:border-[hsl(43,67%,55%)]/30 transition-all shadow-2xl"
            >
              <Phone size={16} className="text-[hsl(43,67%,55%)]" />
              <span className="text-[11px] tracking-wide font-light">{stripHtml(phoneNumber)}</span>
            </motion.a>
            <motion.a
              key="whatsapp"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#111]/95 md:backdrop-blur-xl border border-green-500/20 text-green-400/70 hover:text-green-300 hover:border-green-500/40 transition-all shadow-2xl"
            >
              <MessageCircle size={16} />
              <span className="text-[11px] tracking-wide font-light">WhatsApp</span>
            </motion.a>
          </>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          expanded
            ? "bg-white/10 border border-white/[0.1] text-white/60 hover:text-white"
            : "bg-[hsl(43,67%,55%)] text-black hover:bg-[hsl(43,67%,65%)]"
        }`}
      >
        {expanded ? <X size={20} /> : <Phone size={20} />}
      </button>
    </div>
  );
}
