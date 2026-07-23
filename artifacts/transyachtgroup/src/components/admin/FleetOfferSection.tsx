import { useState, useEffect, useMemo } from "react";
import { Loader2, FileDown } from "lucide-react";
import { fetchVehicles, generateFleetOfferPdf } from "@/lib/api";
import { VehicleThumb } from "./VehicleThumb";
import { stripTags, vehiclePhotos, type VehicleLite } from "./bookingShared";

type Branding = "branded" | "whiteLabel";

interface FleetVehicle extends VehicleLite {
  specs: Record<string, string>;
}

// Spec values can carry rich-text HTML — strip tags before parsing so stray
// digits from style attributes don't leak into the parsed number (same fix
// as the single-vehicle proposal form).
function parseSpecNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(stripTags(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
}

// Nights convention, matching the single-vehicle proposal form. A same-day
// pickup/return still counts as a full 1-day rental rather than 0 — day
// count is calendar-based, not tied to the pickup/return times.
function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (e.getTime() === s.getTime()) return 1;
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

export function FleetOfferSection() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [collectionLocation, setCollectionLocation] = useState("");
  const [validity, setValidity] = useState("24 hours");
  const [branding, setBranding] = useState<Branding>("branded");

  const [ownershipFilter, setOwnershipFilter] = useState<
    "all" | "own" | "agent"
  >("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVehicles(undefined, true, "car")
      .then((v: any[]) =>
        setVehicles(
          v.map((x) => ({
            id: x.id,
            name: stripTags(x.name),
            category: x.category,
            image: x.image || null,
            images: vehiclePhotos(x),
            ownership: x.ownership || "own",
            specs: x.specs || {},
          })),
        ),
      )
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, []);

  const days = useMemo(
    () => calcDays(dateStart, dateEnd),
    [dateStart, dateEnd],
  );

  const vehicleBrand = (v: FleetVehicle): string =>
    stripTags(v.name).trim().split(/\s+/)[0] || "";

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) {
      const b = vehicleBrand(v);
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (
        ownershipFilter !== "all" &&
        (v.ownership || "own") !== ownershipFilter
      )
        return false;
      if (brandFilter !== "all" && vehicleBrand(v) !== brandFilter)
        return false;
      return true;
    });
  }, [vehicles, ownershipFilter, brandFilter]);

  const toggleVehicle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const v of filteredVehicles) next.add(v.id);
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const v of filteredVehicles) next.delete(v.id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0 || days <= 0) return;
    setGenerating(true);
    setError("");
    try {
      const blob = await generateFleetOfferPdf({
        dateRange: {
          start: dateStart,
          end: dateEnd,
          days,
          pickupTime,
          returnTime,
        },
        deliveryLocation: deliveryLocation.trim() || undefined,
        collectionLocation: collectionLocation.trim() || undefined,
        validity: validity.trim() || undefined,
        vehicleIds: Array.from(selectedIds),
        whiteLabel: branding === "whiteLabel",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleet-offer-${dateStart}-to-${dateEnd}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate fleet offer");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rental period */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
          Rental period
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="block text-[10px] text-white/30 mb-1">From</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-[10px] text-white/30 mb-1">To</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-[10px] text-white/30 mb-1">
              Pickup time
            </span>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-[10px] text-white/30 mb-1">
              Return time
            </span>
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-[10px] text-white/30 mb-1">Days</span>
            <input
              type="text"
              readOnly
              value={days || "—"}
              className="w-20 bg-white/[0.02] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white/60 min-h-[44px] cursor-default"
            />
          </div>
        </div>
      </div>

      {/* Locations + validity + branding */}
      <div className="flex flex-wrap gap-6">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Delivery location
          </label>
          <input
            type="text"
            value={deliveryLocation}
            onChange={(e) => setDeliveryLocation(e.target.value)}
            placeholder="e.g. Nice Airport"
            className="w-48 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Collection location
          </label>
          <input
            type="text"
            value={collectionLocation}
            onChange={(e) => setCollectionLocation(e.target.value)}
            placeholder="e.g. Cannes"
            className="w-48 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Offer validity
          </label>
          <input
            type="text"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
            className="w-32 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Branding
          </label>
          <div className="flex gap-1">
            {[
              { key: "branded" as Branding, label: "Branded" },
              { key: "whiteLabel" as Branding, label: "White Label" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setBranding(b.key)}
                className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  branding === b.key
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle selection */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
          Vehicles ({selectedIds.size} selected)
        </label>

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex gap-1">
            {[
              { key: "all" as const, label: "All" },
              { key: "own" as const, label: "Ours" },
              { key: "agent" as const, label: "Agent" },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => setOwnershipFilter(o.key)}
                className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  ownershipFilter === o.key
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setBrandFilter("all")}
                className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  brandFilter === "all"
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                All brands
              </button>
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setBrandFilter(b)}
                  className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                    brandFilter === b
                      ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                      : "border-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 ml-auto">
            <button
              onClick={selectAll}
              className="min-h-[44px] px-3 text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors"
            >
              Select all
            </button>
            <button
              onClick={deselectAll}
              className="min-h-[44px] px-3 text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors"
            >
              Deselect all
            </button>
          </div>
        </div>

        <div className="border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] max-h-[420px] overflow-y-auto">
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-10 text-white/40">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading
              vehicles…
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="px-3 py-6 text-sm text-white/40 text-center">
              No vehicles match the filters.
            </div>
          ) : (
            filteredVehicles.map((v) => {
              const price = parseSpecNumber(v.specs.pricePerDay);
              const checked = selectedIds.has(v.id);
              return (
                <label
                  key={v.id}
                  className="flex items-center gap-3 px-3 py-2 min-h-[44px] cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVehicle(v.id)}
                    className="w-4 h-4 shrink-0 accent-[hsl(43,67%,55%)]"
                  />
                  <VehicleThumb image={v.image} size={36} />
                  <span className="flex-1 text-sm text-white truncate">
                    {v.name}
                  </span>
                  <span className="text-xs text-white/50 shrink-0">
                    {price != null ? `${fmtEur(price)}/day` : "—"}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={selectedIds.size === 0 || days <= 0 || generating}
        className="flex items-center justify-center gap-2 min-h-[44px] px-6 bg-[hsl(43,67%,55%)] text-black rounded-md text-xs uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Generating…
          </>
        ) : (
          <>
            <FileDown size={16} /> Generate Fleet Offer PDF
          </>
        )}
      </button>
    </div>
  );
}
