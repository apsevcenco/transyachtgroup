function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, " and ")
    .replace(/&quot;/gi, " ")
    .replace(/&#39;|&apos;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function vehicleSlug(name: unknown): string {
  return (
    plainText(name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)
      .replace(/-+$/g, "") || "luxury-vehicle"
  );
}

/**
 * `seoSlug` is sent by the API for translated vehicles: the URL is always built from the English
 * name, so /fr/cars/<slug>/ and /cars/<slug>/ share one slug whatever the display language is.
 */
export function vehiclePath(vehicle: {
  id: number | string;
  name: unknown;
  category?: string | null;
  seoSlug?: string | null;
}): string {
  const collection = vehicle.category === "yacht" ? "yachts" : "cars";
  return `/${collection}/${vehicle.seoSlug || vehicleSlug(vehicle.name)}-${vehicle.id}`;
}

export function vehicleIdFromSlug(value: string): string | null {
  return value.match(/(?:^|-)(\d+)$/)?.[1] || null;
}
