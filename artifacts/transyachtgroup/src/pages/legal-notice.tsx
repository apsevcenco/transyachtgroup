import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { fetchContent } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { CmsContent } from "@/components/CmsContent";

export default function LegalNotice() {
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const { lang } = useLanguage();

  useEffect(() => {
    fetchContent(lang)
      .then((data) => setSiteContent(data || {}))
      .catch(() => setSiteContent({}));
  }, [lang]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      <main className="px-4 pt-36 pb-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold/50 mb-5 font-light">
            Legal
          </p>

         <CmsContent
  as="h1"
  className="font-serif text-4xl md:text-6xl text-white mb-8 tracking-tight"
  html={siteContent.legal_notice_title || "<p>Legal Notice</p>"}
/>

          <div className="gold-line w-24 mb-10" />

          <CmsContent
            as="div"
            className="text-white/60 font-light leading-relaxed space-y-6"
            html={
              siteContent.legal_notice_content ||
              "<p>Legal Notice content will be added soon.</p>"
            }
          />
        </div>
      </main>
    </div>
  );
}
