import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { fetchContent } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { CmsContent } from "@/components/CmsContent";

export default function PrivacyPolicy() {
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
  html={siteContent.privacy_policy_title || "<p>Privacy Policy</p>"}
/>

          <div className="gold-line w-24 mb-10" />

          <div className="max-w-3xl text-white/70 font-light leading-relaxed space-y-6 [&_*]:!text-[14px] [&_*]:!leading-relaxed [&_p]:!mb-4 [&_strong]:!text-white [&_h1]:!text-2xl [&_h2]:!text-xl [&_h3]:!text-lg">
            <CmsContent
              as="div"
              html={
                siteContent.privacy_policy_content ||
                "<p>Privacy Policy content will be added soon.</p>"
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
