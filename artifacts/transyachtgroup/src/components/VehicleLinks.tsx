import { ChevronRight } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { PAGE_LABELS } from "@/data/pageLabels";
import { landingTitle } from "@/data/serviceLandingsI18n";
import { relatedVehicles, seoVehicleName, vehicleServiceLinks, type VehicleLike } from "@/data/vehicleContent";
import { vehicleLangs } from "@/lib/langRoutes";
import { vehiclePath } from "@/lib/vehicleSeo";

const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/60 transition hover:border-[hsl(43,67%,55%)]/40 hover:text-[hsl(43,67%,55%)]";

const plainName = (value: unknown) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/**
 * Additive internal links on vehicle pages (service pages and similar vehicles). On a language page the
 * service links use the translated page titles and only vehicles that exist in that language are suggested.
 */
export function VehicleLinks({ vehicle, vehicles }: { vehicle: VehicleLike; vehicles: VehicleLike[] }) {
  const { lang, lp } = useLanguage();
  const services = vehicleServiceLinks(vehicle);
  const candidates = lang === "en" ? vehicles : vehicles.filter((item) => vehicleLangs(item as { translations?: unknown }).includes(lang));
  const related = relatedVehicles(candidates, vehicle);
  if (!services.length && !related.length) return null;
  return (
    <nav aria-label="Related pages" className="mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-light mb-4">{PAGE_LABELS[lang].explore}</h2>
      <ul className="flex flex-wrap gap-2">
        {services.map((service) => (
          <li key={service.href}>
            <a href={lp(service.href)} className={pill}>
              {landingTitle(service.href.split("/")[2], lang) ?? service.label} <ChevronRight size={12} />
            </a>
          </li>
        ))}
        {related.map((item) => (
          <li key={String(item.id)}>
            <a href={lp(`${vehiclePath(item)}/`)} className={pill}>
              {lang === "en" ? seoVehicleName(item) : plainName(item.name)} <ChevronRight size={12} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
