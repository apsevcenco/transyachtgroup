import { useQuery } from "@tanstack/react-query";
import { fetchPublicReviews } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const headings: Record<string, [string, string]> = {
  en: ["Client experiences", "Verified journeys, shared by our clients"],
  fr: ["Expériences clients", "Des expériences authentiques partagées par nos clients"],
  ru: ["Отзывы клиентов", "Реальные впечатления наших клиентов"],
  ro: ["Experiențele clienților", "Experiențe autentice împărtășite de clienții noștri"],
  ar: ["تجارب العملاء", "تجارب حقيقية يشاركها عملاؤنا"],
};
export function CustomerReviews() {
  const { lang } = useLanguage();
  const { data = [] } = useQuery({ queryKey: ["public-reviews"], queryFn: fetchPublicReviews });
  if (!data.length) return null;
  const [title, subtitle] = headings[lang] || headings.en;
  return <section className="relative z-10 bg-[hsl(0,0%,4%)] border-y border-white/[0.06] px-6 py-20">
    <div className="max-w-7xl mx-auto"><div className="text-center mb-12"><p className="text-gold/70 uppercase tracking-[.3em] text-xs">Google Reviews</p><h2 className="font-serif text-3xl md:text-5xl text-white mt-3">{title}</h2><p className="text-white/40 mt-3">{subtitle}</p></div>
      <div className="grid md:grid-cols-3 gap-5">{data.slice(0, 6).map((r) => <article key={r.id} className="border border-white/10 bg-white/[0.025] p-7"><div className="text-gold tracking-[.2em]" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}<span className="text-white/15">{"★".repeat(5-r.rating)}</span></div><blockquote className="text-white/70 leading-relaxed mt-5">“{r.reviewText}”</blockquote><div className="mt-6 text-sm text-white">{r.clientName}<span className="block text-xs text-white/35 mt-1">{r.vehicleName || "Trans Yacht Group"}</span></div>{r.googleReviewUrl && <a href={r.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs text-gold/70 underline underline-offset-4">View on Google</a>}</article>)}</div>
    </div>
  </section>;
}
