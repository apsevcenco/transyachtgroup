function plainVehicleName(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function vehicleSlug(value: unknown): string {
  return plainVehicleName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "vehicle";
}

export function vehiclePath(vehicle: { id: number | string; name: unknown; category: unknown }): string {
  const section = vehicle.category === "yacht" ? "yachts" : "cars";
  return `/${section}/${vehicleSlug(vehicle.name)}-${vehicle.id}`;
}
