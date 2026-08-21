import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  checkAuth,
  adminLogout,
  seedData,
  fetchVehicles,
  fetchContentAll,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  fetchVehicleTrash,
  fetchVehicleDeletionLog,
  restoreVehicle,
  permanentlyDeleteVehicle,
  type DeletedVehicle,
  type VehicleDeletionLog,
  updateContent,
  fetchRequests,
  updateRequest,
  deleteRequest,
  translateText,
  fetchAnalyticsStats,
  fetchAgents,
  type Agent,
  uploadAdminPublicImage,
  deleteAdminPublicImage,
} from "@/lib/api";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Trash2,
  RotateCcw,
} from "lucide-react";
import RichTextEditor, {
  SharedToolbarGroup,
} from "@/components/RichTextEditor";
import { compressImage } from "@/lib/imageCompress";
import { CarBookingCalendar } from "@/components/admin/CarBookingCalendar";
import { YachtBookingCalendar } from "@/components/admin/YachtBookingCalendar";
import { CrmDashboard } from "@/components/admin/CrmDashboard";
import { AgentsDashboard } from "@/components/admin/AgentsDashboard";
import { ProposalsDashboard } from "@/components/admin/ProposalsDashboard";
import { ReviewsDashboard } from "@/components/admin/ReviewsDashboard";
import {
  ContractGenerator,
  buildContractPrefillFromBooking,
  type ContractPrefill,
} from "@/components/admin/ContractGenerator";
import type { Booking, StoredContract } from "@/lib/api";
import DOMPurify from "dompurify";

const API_ORIGIN =
  (import.meta.env.VITE_API_ORIGIN as string | undefined) ?? "";

type Vehicle = {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[] | null;
  featured: boolean | null;
  visible: boolean | null;
  specs: Record<string, string> | null;
  translations: Record<string, Record<string, string>> | null;
  ownership: string | null;
  agentId: number | null;
};

type ContentItem = {
  id: number;
  key: string;
  value: string;
  translations: Record<string, string> | null;
};

type ContactRequest = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  interest: string | null;
  message: string;
  status: string | null;
  createdAt: string;
};

type Tab =
  | "cars"
  | "yachts"
  | "content"
  | "requests"
  | "analytics"
  | "car-bookings"
  | "yacht-bookings"
  | "crm"
  | "agents"
  | "proposals"
  | "contracts"
  | "reviews"
  | "trash";

type AnalyticsStats = {
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
    avgSessionDuration: number;
    pagesPerSession: number;
    formSubmissions: number;
    conversionRate: number;
    totalRequests: number;
    vehicleDetailViews: number;
    totalSessions: number;
  };
  dailyChart?: Array<{
    date: string;
    views: number;
    visitors: number;
    conversions: number;
  }>;
  hourlyBreakdown?: Array<{
    hour: number;
    views: number;
  }>;
  pageBreakdown?: Record<string, number>;
  referrerBreakdown?: Record<string, number>;
  deviceBreakdown?: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  browserBreakdown?: Record<string, number>;
  languageBreakdown?: Record<string, number>;
  vehicleViewBreakdown?: Record<string, number>;
};

const ADMIN_LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

const NON_TRANSLATABLE = new Set([
  "phone_number",
  "whatsapp_number",
  "admin_email",
  "office_photos",
]);

function getCarSpecFields(units: "metric" | "imperial") {
  const m = units === "metric";
  return [
    {
      key: "pricePerDay",
      label: "Price / Day (EUR)",
      placeholder: "e.g. 2500",
    },
    {
      key: "pricePerThreeDays",
      label: "Price / 3 Days (EUR)",
      placeholder: "e.g. 6500",
    },
    {
      key: "pricePerMonth",
      label: "Price / Month (EUR)",
      placeholder: "e.g. 45000",
    },
    { key: "engine", label: "Engine", placeholder: "e.g. 4.0L V8 Twin-Turbo" },
    { key: "horsepower", label: "Power (HP)", placeholder: "e.g. 650" },
    {
      key: "torque",
      label: m ? "Torque (Nm)" : "Torque (lb·ft)",
      placeholder: m ? "e.g. 850" : "e.g. 627",
    },
    {
      key: "acceleration",
      label: m ? "0–100 km/h (s)" : "0–60 mph (s)",
      placeholder: "e.g. 3.6",
    },
    {
      key: "topSpeed",
      label: m ? "Top Speed (km/h)" : "Top Speed (mph)",
      placeholder: m ? "e.g. 305" : "e.g. 190",
    },
    {
      key: "transmission",
      label: "Transmission",
      placeholder: "e.g. 8-Speed Automatic",
    },
    { key: "drivetrain", label: "Drivetrain", placeholder: "e.g. AWD / RWD" },
    { key: "seats", label: "Seats", placeholder: "e.g. 4" },
    {
      key: "fuelType",
      label: "Fuel Type",
      placeholder: "e.g. Petrol / Hybrid",
    },
    { key: "year", label: "Year", placeholder: "e.g. 2024" },
    {
      key: "kmIncluded",
      label: "Kilometers Included",
      placeholder: "e.g. 300",
    },
    {
      key: "extraPricePerKm",
      label: "Extra Price per km (EUR)",
      placeholder: "e.g. 3.50",
    },
    { key: "deposit", label: "Deposit (EUR)", placeholder: "e.g. 5000" },
    // Rental Agreement fields — read by the Contract Generator's Section B
    // (Vehicle Details). Not shown on the public site, only in the admin
    // vehicle form and the generated PDF.
    {
      key: "bodyType",
      label: "Body Type / Category",
      placeholder: "e.g. Sedan, SUV, Convertible",
    },
    {
      key: "registrationPlate",
      label: "Registration Plate",
      placeholder: "e.g. AB-123-CD",
    },
    {
      key: "vin",
      label: "VIN / Chassis No.",
      placeholder: "e.g. WBA1234567890ABCD",
    },
    { key: "colour", label: "Colour", placeholder: "e.g. Black" },
  ];
}

function getYachtSpecFields(units: "metric" | "imperial") {
  const m = units === "metric";
  return [
    {
      key: "pricePerDay",
      label: "Price / Day (EUR)",
      placeholder: "e.g. 15000",
    },
    {
      key: "pricePerWeek",
      label: "Price / Week (EUR) — auto: day × 6",
      placeholder: "auto-calculated",
    },
    {
      key: "pricingType",
      label: "Pricing Type",
      placeholder: "plus APA / All included",
    },
    {
      key: "length",
      label: m ? "Length (m)" : "Length (ft)",
      placeholder: m ? "e.g. 28" : "e.g. 92",
    },
    {
      key: "beam",
      label: m ? "Beam (m)" : "Beam (ft)",
      placeholder: m ? "e.g. 6.5" : "e.g. 21.3",
    },
    {
      key: "draft",
      label: m ? "Draft (m)" : "Draft (ft)",
      placeholder: m ? "e.g. 1.8" : "e.g. 5.9",
    },
    { key: "cabins", label: "Cabins", placeholder: "e.g. 4" },
    { key: "guests", label: "Max Guests", placeholder: "e.g. 10" },
    { key: "crew", label: "Crew", placeholder: "e.g. 4" },
    {
      key: "cruisingSpeed",
      label: "Cruising Speed (knots)",
      placeholder: "e.g. 24",
    },
    { key: "maxSpeed", label: "Max Speed (knots)", placeholder: "e.g. 30" },
    {
      key: "fuelCapacity",
      label: m ? "Fuel Capacity (L)" : "Fuel Capacity (gal)",
      placeholder: m ? "e.g. 6000" : "e.g. 1585",
    },
    {
      key: "waterCapacity",
      label: m ? "Water Capacity (L)" : "Water Capacity (gal)",
      placeholder: m ? "e.g. 1200" : "e.g. 317",
    },
    { key: "yearBuilt", label: "Year Built", placeholder: "e.g. 2023" },
    {
      key: "builder",
      label: "Builder / Shipyard",
      placeholder: "e.g. Sunseeker",
    },
  ];
}

const stripTags = (s: string) => {
  let result = s.replace(/<[^>]*>/g, "");
  result = result
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, "");
  result = result.replace(/<[^>]*>/g, "");
  return result.trim();
};

function cleanImageUrl(input?: string | null): string {
  if (!input || typeof input !== "string") return "";

  let value = input.trim();
  if (!value) return "";

  const imgSrcMatch = value.match(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (imgSrcMatch?.[1]) {
    value = imgSrcMatch[1].trim();
  }

  const hrefMatch = value.match(/href\s*=\s*["']([^"']+)["']/i);
  if (!imgSrcMatch?.[1] && hrefMatch?.[1]) {
    value = hrefMatch[1].trim();
  }

  value = value.replace(/<[^>]+>/g, "").trim();
  value = value.replace(/^['"`\s]+|['"`\s]+$/g, "").trim();

  if (!value) return "";

  const absoluteMatch = value.match(/https?:\/\/[^\s"'<>]+/i);
  if (absoluteMatch?.[0]) {
    return absoluteMatch[0];
  }

  if (value.startsWith("/uploads/")) {
    return `${API_ORIGIN}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${API_ORIGIN}/${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return value;
}

const convertPlainToHtml = (text: string) => {
  if (!text) return "<p></p>";
  if (text.trim().startsWith("<")) return text;
  return (
    text
      .split(/\n\n+/)
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("") || "<p></p>"
  );
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const params = useParams<{ section?: string }>();
  const mobileSection = params.section;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("cars");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  // Set by CarBookingCalendar's "Generate Contract" button — switches to the
  // Contracts tab and hands the booking's data to ContractGenerator as a
  // starting point, rather than a blank form.
  const [contractPrefill, setContractPrefill] =
    useState<ContractPrefill | null>(null);

  const handleGenerateContractFromBooking = (
    booking: Booking,
    contract?: StoredContract,
  ) => {
    const base = buildContractPrefillFromBooking(booking);
    const snapshot = contract?.snapshot;
    setContractPrefill(
      contract && snapshot
        ? {
            ...base,
            editContractNumber: contract.contractNumber,
            renterName: snapshot.renter?.name,
            renterDob: snapshot.renter?.dob,
            renterPob: snapshot.renter?.pob,
            renterNationality: snapshot.renter?.nationality,
            renterPassport: snapshot.renter?.passport,
            renterPassportExpiry: snapshot.renter?.passportExpiry,
            renterLicence: snapshot.renter?.licence,
            renterLicenceExpiry: snapshot.renter?.licenceExpiry,
            renterLicenceIssuedBy: snapshot.renter?.licenceIssuedBy,
            renterPhone: snapshot.renter?.phone,
            renterEmail: snapshot.renter?.email,
            additionalDriverName: snapshot.additionalDriver?.name,
            additionalDriverDob: snapshot.additionalDriver?.dob,
            additionalDriverLicence: snapshot.additionalDriver?.licence,
            additionalDriverLicenceExpiry:
              snapshot.additionalDriver?.licenceExpiry,
            additionalDriverLicenceIssuedBy:
              snapshot.additionalDriver?.licenceIssuedBy,
            pickupDate: snapshot.pickupDate,
            returnDate: snapshot.returnDate,
            pickupTime: snapshot.pickupTime || base.pickupTime,
            returnTime: snapshot.returnTime || base.returnTime,
            pickupLocation: snapshot.pickupLocation,
            returnLocation: snapshot.returnLocation,
            totalAmount: snapshot.totalAmount,
            deliveryCost: snapshot.deliveryCost ?? base.deliveryCost,
            depositAmount: snapshot.depositAmount,
            kmPerDay: snapshot.kmPerDay,
            extraKmPrice: snapshot.extraKmPrice,
            representativeName: snapshot.representativeName,
          }
        : base,
    );
    setTab("contracts");
  };

  // On mobile, the URL's :section param drives which content shows in the
  // dedicated section view (see the render split below). Keep `tab` in sync
  // so both the mobile section view and the desktop tab bar share one
  // source of truth for "which content is active".
  useEffect(() => {
    if (!mobileSection) return;
    if (mobileSection === "vehicles") {
      setTab((prev) => (prev === "cars" || prev === "yachts" ? prev : "cars"));
    } else if (
      mobileSection === "content" ||
      mobileSection === "requests" ||
      mobileSection === "analytics" ||
      mobileSection === "reviews" ||
      mobileSection === "trash"
    ) {
      setTab(mobileSection as Tab);
    }
  }, [mobileSection]);

  const loadData = useCallback(async () => {
    try {
      const [vehiclesRes, contentRes, requestsRes] = await Promise.allSettled([
        fetchVehicles(undefined, true),
        fetchContentAll(),
        fetchRequests(),
      ]);

      if (vehiclesRes.status === "fulfilled") {
        const v = vehiclesRes.value;
        setVehicles(
          Array.isArray(v)
            ? v.map((vehicle) => ({
                ...vehicle,
                image:
                  cleanImageUrl(vehicle.image) ||
                  cleanImageUrl(vehicle.images?.[0] || ""),
                images: Array.isArray(vehicle.images)
                  ? vehicle.images
                      .map((img: string) => cleanImageUrl(img))
                      .filter(Boolean)
                  : [],
              }))
            : [],
        );
      } else {
        console.error("fetchVehicles failed:", vehiclesRes.reason);
        setVehicles([]);
      }

      if (contentRes.status === "fulfilled") {
        const c = contentRes.value;

        setContent(c);
      } else {
        console.error("fetchContentAll failed:", contentRes.reason);
        setContent([]);
      }

      if (requestsRes.status === "fulfilled") {
        setRequests(requestsRes.value);
      } else {
        console.error("fetchRequests failed:", requestsRes.reason);
        setRequests([]);
      }

      setMessage("");
    } catch (err) {
      console.error("ADMIN LOAD CRASHED:", err);
      setMessage("Failed to load data");
    }
  }, []);
  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) {
        setLocation("/admin");
        return;
      }
      setLoading(false);
      void loadData();
    });
  }, [loadData, setLocation]);

  const handleSeed = async () => {
    try {
      setSaving(true);
      const result = await seedData();
      setMessage(result.message);
      await loadData();
    } catch {
      setMessage("Seed failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setLocation("/admin");
  };

  const currentCategory = tab === "cars" ? "car" : "yacht";

  const handleToggleVisibility = async (vehicle: Vehicle) => {
    try {
      await updateVehicle(vehicle.id, {
        name: vehicle.name,
        category: vehicle.category,
        description: vehicle.description,
        image: cleanImageUrl(vehicle.image),
        images: (vehicle.images || [])
          .map((img) => cleanImageUrl(img))
          .filter(Boolean),
        featured: vehicle.featured ?? false,
        visible: !(vehicle.visible !== false),
        specs: vehicle.specs || {},
        translations: vehicle.translations || {},
        ownership: vehicle.ownership || "own",
        agentId: vehicle.agentId ?? null,
      });
      await loadData();
      setMessage(
        vehicle.visible !== false ? "Hidden from site" : "Published to site",
      );
    } catch {
      setMessage("Failed to update");
    }
  };

  const handleSaveVehicle = async (data: {
    name: string;
    category: string;
    description: string;
    image: string;
    images: string[];
    featured: boolean;
    visible?: boolean;
    specs: Record<string, string>;
    translations?: Record<string, Record<string, string>>;
    ownership?: string;
    agentId?: number | null;
  }) => {
    setSaving(true);
    try {
      const normalizedData = {
        ...data,
        image:
          cleanImageUrl(data.image) || cleanImageUrl(data.images?.[0] || ""),
        images: Array.isArray(data.images)
          ? data.images.map((img) => cleanImageUrl(img)).filter(Boolean)
          : [],
      };

      if (editingVehicle && editingVehicle.id > 0) {
        await updateVehicle(editingVehicle.id, normalizedData);
      } else {
        await createVehicle(normalizedData);
      }
      setEditingVehicle(null);
      setShowNewForm(false);
      await loadData();
      setMessage("Saved successfully");
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteVehicle(id);
      await loadData();
      setMessage("Deleted successfully");
    } catch {
      setMessage("Failed to delete");
    }
  };

  const handleSaveContent = async (
    key: string,
    value: string,
    translations?: Record<string, string>,
  ) => {
    setSaving(true);
    try {
      await updateContent(key, value, translations);
      setEditingContent(null);
      await loadData();
      setMessage("Content updated");
    } catch {
      setMessage("Failed to update content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading...</div>
      </div>
    );
  }

  const cars = vehicles.filter((v) => v.category === "car");
  const yachts = vehicles.filter((v) => v.category === "yacht");

  // Shared between the desktop tab bar and the mobile dedicated-section view —
  // both just render whatever `tab` currently is, from a single source of truth.
  const tabContent = (
    <>
      {(tab === "cars" || tab === "yachts") && (
        <CatalogSection
          category={currentCategory}
          vehicles={tab === "cars" ? cars : yachts}
          editingVehicle={editingVehicle}
          showNewForm={showNewForm}
          saving={saving}
          onEdit={setEditingVehicle}
          onNew={() => {
            setShowNewForm(true);
            setEditingVehicle(null);
          }}
          onCancel={() => {
            setEditingVehicle(null);
            setShowNewForm(false);
          }}
          onSave={handleSaveVehicle}
          onDelete={handleDeleteVehicle}
          onToggleVisibility={handleToggleVisibility}
        />
      )}

      {tab === "content" && (
        <ContentTab
          content={content}
          editingContent={editingContent}
          saving={saving}
          onEdit={setEditingContent}
          onCancel={() => setEditingContent(null)}
          onSave={handleSaveContent}
        />
      )}

      {tab === "requests" && (
        <RequestsTab
          requests={requests}
          onUpdate={(updated) =>
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r)),
            )
          }
          onDelete={(id) =>
            setRequests((prev) => prev.filter((r) => r.id !== id))
          }
        />
      )}

      {tab === "car-bookings" && (
        <CarBookingCalendar
          onGenerateContract={handleGenerateContractFromBooking}
        />
      )}

      {tab === "yacht-bookings" && <YachtBookingCalendar />}

      {tab === "analytics" && <AnalyticsTab />}

      {tab === "crm" && <CrmDashboard />}

      {tab === "agents" && <AgentsDashboard />}

      {tab === "proposals" && <ProposalsDashboard />}

      {tab === "contracts" && <ContractGenerator prefill={contractPrefill} />}

      {tab === "reviews" && <ReviewsDashboard />}

      {tab === "trash" && <VehicleTrash onChanged={loadData} />}
    </>
  );

  const MOBILE_MENU_ITEMS: { label: string; icon: string; go: () => void }[] = [
    {
      label: "Vehicles (Cars & Yachts)",
      icon: "🚗",
      go: () => setLocation("/admin/dashboard/vehicles"),
    },
    {
      label: "Car Bookings",
      icon: "📅",
      go: () => setLocation("/admin/bookings/cars"),
    },
    {
      label: "Yacht Bookings",
      icon: "⚓",
      go: () => setLocation("/admin/bookings/yachts"),
    },
    { label: "CRM", icon: "💼", go: () => setLocation("/admin/crm") },
    { label: "Agents", icon: "🤝", go: () => setLocation("/admin/agents") },
    {
      label: "Proposals",
      icon: "📄",
      go: () => setLocation("/admin/proposals"),
    },
    {
      label: "Contracts",
      icon: "📝",
      go: () => setLocation("/admin/contracts"),
    },
    {
      label: "Customer Reviews",
      icon: "★",
      go: () => setLocation("/admin/dashboard/reviews"),
    },
    {
      label: "Content / CMS",
      icon: "✎",
      go: () => setLocation("/admin/dashboard/content"),
    },
    {
      label: "Fleet Trash & Deletion Log",
      icon: "Trash",
      go: () => setLocation("/admin/dashboard/trash"),
    },
    {
      label: "Guides & Articles",
      icon: "G",
      go: () => setLocation("/admin/guides"),
    },
    {
      label: "Requests",
      icon: "📩",
      go: () => setLocation("/admin/dashboard/requests"),
    },
    {
      label: "Analytics",
      icon: "📊",
      go: () => setLocation("/admin/dashboard/analytics"),
    },
  ];

  const DESKTOP_NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
    { key: "trash", label: "Fleet Trash & Log", icon: "Trash" },
    { key: "cars", label: `Cars (${cars.length})`, icon: "🚗" },
    { key: "yachts", label: `Yachts (${yachts.length})`, icon: "🛥" },
    { key: "car-bookings", label: "Car Bookings", icon: "📅" },
    { key: "yacht-bookings", label: "Yacht Bookings", icon: "⚓" },
    { key: "crm", label: "CRM", icon: "💼" },
    { key: "agents", label: "Agents", icon: "🤝" },
    { key: "proposals", label: "Proposals", icon: "📄" },
    { key: "contracts", label: "Contracts", icon: "📝" },
    { key: "reviews", label: "Customer Reviews", icon: "★" },
    { key: "content", label: "Site Content", icon: "✎" },
    { key: "requests", label: "Requests", icon: "📩" },
    { key: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] text-white">
      <header className="border-b border-white/[0.06] bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-transparent.png`}
              alt="TRANSYACHTGROUP"
              className="h-8 w-auto opacity-70"
            />
            <span className="text-white/30 text-xs uppercase tracking-[0.2em]">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="text-white/30 hover:text-white/60 text-xs uppercase tracking-[0.15em] transition-colors"
            >
              View Site
            </button>
            <button
              onClick={handleLogout}
              className="text-red-400/60 hover:text-red-400 text-xs uppercase tracking-[0.15em] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {message && (
          <div className="bg-[hsl(43,67%,55%)]/10 border border-[hsl(43,67%,55%)]/20 rounded-lg px-4 py-3 text-[hsl(43,67%,55%)] text-sm mb-6 flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-[hsl(43,67%,55%)]/60 hover:text-[hsl(43,67%,55%)]"
            >
              &times;
            </button>
          </div>
        )}

        {vehicles.length === 0 && content.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/40 mb-4">
              No data found. Seed the initial content?
            </p>
            <button
              onClick={handleSeed}
              disabled={saving}
              className="bg-[hsl(43,67%,55%)] text-black px-6 py-3 rounded-md text-xs uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-50 transition-colors"
            >
              {saving ? "Seeding..." : "Seed Initial Data"}
            </button>
          </div>
        )}

        {/* Mobile: full-screen menu, or a dedicated section view driven by the URL's :section param */}
        <div className="lg:hidden">
          {!mobileSection ? (
            <div className="space-y-3">
              {MOBILE_MENU_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={item.go}
                  className="w-full min-h-[60px] flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] active:bg-white/[0.07] transition-colors text-left"
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <span className="flex-1 text-white text-sm font-light uppercase tracking-[0.1em]">
                    {item.label}
                  </span>
                  <ChevronRight size={20} className="text-white/30 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setLocation("/admin/dashboard")}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors min-h-[44px] mb-4"
              >
                <ArrowLeft size={18} />
                <span className="text-xs uppercase tracking-[0.15em]">
                  Back to Menu
                </span>
              </button>

              {mobileSection === "vehicles" && (
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setTab("cars")}
                    className={`flex-1 min-h-[44px] rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                      tab === "cars"
                        ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                        : "border-white/10 text-white/50 hover:text-white/70"
                    }`}
                  >
                    🚗 Cars ({cars.length})
                  </button>
                  <button
                    onClick={() => setTab("yachts")}
                    className={`flex-1 min-h-[44px] rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                      tab === "yachts"
                        ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                        : "border-white/10 text-white/50 hover:text-white/70"
                    }`}
                  >
                    🛥 Yachts ({yachts.length})
                  </button>
                </div>
              )}

              {tabContent}
            </div>
          )}
        </div>

        {/* Desktop: persistent section navigation on the left. */}
        <div className="hidden lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] gap-8 xl:gap-10 items-start">
          <aside className="sticky top-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="px-3 pt-2 pb-3 text-[9px] uppercase tracking-[0.28em] text-white/25">
              Sections
            </p>
            <nav className="space-y-1">
              {DESKTOP_NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setTab(item.key);
                    setEditingVehicle(null);
                    setShowNewForm(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors ${
                    tab === item.key
                      ? "bg-[hsl(43,67%,55%)]/12 text-gold border border-gold/20"
                      : "text-white/45 hover:text-white/75 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <span className="w-6 text-center text-base">
                    {item.icon}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.12em]">
                    {item.label}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setLocation("/admin/guides")}
                className="w-full min-h-[44px] flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-white/45 hover:text-white/75 hover:bg-white/[0.04] border border-transparent transition-colors"
              >
                <span className="w-6 text-center text-base">G</span>
                <span className="text-[11px] uppercase tracking-[0.12em]">Guides & Articles</span>
              </button>
            </nav>
          </aside>

          <main className="min-w-0">{tabContent}</main>
        </div>
      </div>
    </div>
  );
}

function VehicleTrash({ onChanged }: { onChanged: () => Promise<void> }) {
  const [deleted, setDeleted] = useState<DeletedVehicle[]>([]);
  const [log, setLog] = useState<VehicleDeletionLog[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoadingTrash(true);
    setError("");
    try {
      const [trashRows, logRows] = await Promise.all([
        fetchVehicleTrash(),
        fetchVehicleDeletionLog(),
      ]);
      setDeleted(trashRows);
      setLog(logRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trash");
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const restore = async (vehicle: DeletedVehicle) => {
    setBusyId(vehicle.id);
    try {
      await restoreVehicle(vehicle.id);
      await Promise.all([reload(), onChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  };

  const removeForever = async (vehicle: DeletedVehicle) => {
    const confirmation = window.prompt(
      `Permanent deletion cannot be undone and may remove linked data. Type the exact name to continue:\n\n${stripTags(vehicle.name)}`,
    );
    if (confirmation !== vehicle.name && confirmation !== stripTags(vehicle.name)) {
      if (confirmation !== null) setError("Permanent deletion cancelled: the name did not match.");
      return;
    }
    setBusyId(vehicle.id);
    try {
      await permanentlyDeleteVehicle(vehicle.id, vehicle.name);
      await Promise.all([reload(), onChanged()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent deletion failed");
    } finally {
      setBusyId(null);
    }
  };

  const actionLabel: Record<VehicleDeletionLog["action"], string> = {
    trashed: "Moved to trash",
    restored: "Restored",
    permanently_deleted: "Permanently deleted",
  };

  return (
    <section className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">Fleet safety</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Trash & deletion log</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/40">Deleted cars and yachts stay here until restored or permanently removed. Every action is recorded with its time and administrator session.</p>
      </div>

      {error && <div className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/70">In trash ({deleted.length})</h3>
          <button onClick={() => void reload()} className="text-xs text-gold/70 hover:text-gold">Refresh</button>
        </div>
        {loadingTrash ? <p className="py-8 text-center text-sm text-white/30">Loading…</p> : deleted.length === 0 ? <p className="py-8 text-center text-sm text-white/30">Trash is empty.</p> : (
          <div className="space-y-3">
            {deleted.map((vehicle) => (
              <div key={vehicle.id} className="flex flex-col gap-4 rounded-lg border border-white/[0.06] bg-black/20 p-4 sm:flex-row sm:items-center">
                <img src={cleanImageUrl(vehicle.image)} alt="" className="h-16 w-24 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/80">{stripTags(vehicle.name)}</p>
                  <p className="mt-1 text-xs text-white/30">{vehicle.category === "yacht" ? "Yacht" : "Car"} · deleted {new Date(vehicle.deletedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === vehicle.id} onClick={() => void restore(vehicle)} className="inline-flex items-center gap-2 rounded border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300 disabled:opacity-40"><RotateCcw size={14}/> Restore</button>
                  <button disabled={busyId === vehicle.id} onClick={() => void removeForever(vehicle)} className="inline-flex items-center gap-2 rounded border border-red-400/20 px-3 py-2 text-xs text-red-300 disabled:opacity-40"><Trash2 size={14}/> Delete forever</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h3 className="mb-4 text-sm uppercase tracking-[0.15em] text-white/70">Deletion history</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-white/[0.07] text-white/30"><tr><th className="pb-3 font-normal">Date</th><th className="pb-3 font-normal">Item</th><th className="pb-3 font-normal">Action</th><th className="pb-3 font-normal">Administrator</th><th className="pb-3 font-normal">IP</th></tr></thead>
            <tbody>{log.map((entry) => <tr key={entry.id} className="border-b border-white/[0.04] text-white/55"><td className="py-3 pr-4">{new Date(entry.createdAt).toLocaleString()}</td><td className="py-3 pr-4">{stripTags(entry.vehicleName)} <span className="text-white/25">#{entry.vehicleId}</span></td><td className="py-3 pr-4">{actionLabel[entry.action]}</td><td className="py-3 pr-4">{entry.actor}</td><td className="py-3">{entry.ipAddress || "—"}</td></tr>)}</tbody>
          </table>
          {!loadingTrash && log.length === 0 && <p className="py-8 text-center text-sm text-white/30">No deletion actions recorded yet.</p>}
        </div>
      </div>
    </section>
  );
}

function CatalogSection({
  category,
  vehicles,
  editingVehicle,
  showNewForm,
  saving,
  onEdit,
  onNew,
  onCancel,
  onSave,
  onDelete,
  onToggleVisibility,
}: {
  category: string;
  vehicles: Vehicle[];
  editingVehicle: Vehicle | null;
  showNewForm: boolean;
  saving: boolean;
  onEdit: (v: Vehicle) => void;
  onNew: () => void;
  onCancel: () => void;
  onSave: (data: {
    name: string;
    category: string;
    description: string;
    image: string;
    images: string[];
    featured: boolean;
    specs: Record<string, string>;
    translations?: Record<string, Record<string, string>>;
    ownership?: string;
    agentId?: number | null;
  }) => void;
  onDelete: (id: number) => void;
  onToggleVisibility: (v: Vehicle) => void;
}) {
  const isCar = category === "car";
  const label = isCar ? "Car" : "Yacht";

  const [ownershipFilter, setOwnershipFilter] = useState<
    "all" | "own" | "agent"
  >("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const vehicleFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingVehicle) return;
    const frame = window.requestAnimationFrame(() => {
      vehicleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      vehicleFormRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingVehicle?.id]);

  const vehicleBrand = (v: Vehicle): string =>
    stripTags(v.name).trim().split(/\s+/)[0] || "";

  // Brand filter is car-only — extracted from the first word of the vehicle
  // name (e.g. "Mercedes-Benz S580" -> "Mercedes-Benz").
  const brands = useMemo(() => {
    if (!isCar) return [];
    const set = new Set<string>();
    for (const v of vehicles) {
      const brand = vehicleBrand(v);
      if (brand) set.add(brand);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles, isCar]);

  const filteredVehicles = useMemo(() => {
    if (!isCar) return vehicles;
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
  }, [vehicles, isCar, ownershipFilter, brandFilter]);

  const filtersActive = ownershipFilter !== "all" || brandFilter !== "all";
  const clearFilters = () => {
    setOwnershipFilter("all");
    setBrandFilter("all");
  };

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-6">
        <h2 className="font-serif text-xl text-white">{label} Catalog</h2>
        <div className="flex items-center gap-2">
          {isCar && (
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className={`min-h-[38px] hidden lg:flex items-center gap-2 px-3.5 rounded-md border text-[10px] uppercase tracking-[0.15em] transition-colors ${
                filtersOpen || filtersActive
                  ? "border-gold/35 bg-gold/10 text-gold"
                  : "border-white/10 text-white/45 hover:text-white/75 hover:border-white/20"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {filtersActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              )}
              <ChevronDown
                size={13}
                className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <button
            onClick={onNew}
            className="bg-[hsl(43,67%,55%)] text-black px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] transition-colors"
          >
            + Add {label}
          </button>
        </div>
      </div>

      {isCar && (
        <div
          className={`mb-6 space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 animate-in slide-in-from-top-2 fade-in duration-200 ${
            filtersOpen ? "lg:block" : "lg:hidden"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-6">
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                Ownership
              </span>
              <div className="flex gap-1">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "own", label: "Ours" },
                    { key: "agent", label: "Agent" },
                  ] as const
                ).map((o) => (
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
            </div>

            {brands.length > 0 && (
              <div>
                <span className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                  Brand
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setBrandFilter("all")}
                    className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                      brandFilter === "all"
                        ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                        : "border-white/10 text-white/50 hover:text-white/70"
                    }`}
                  >
                    All
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
              </div>
            )}

            {filtersActive && (
              <button
                onClick={clearFilters}
                className="min-h-[44px] px-3 text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="text-[11px] text-white/40">
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
          </p>
        </div>
      )}

      {(showNewForm || editingVehicle) && (
        <div ref={vehicleFormRef} tabIndex={-1} className="scroll-mt-6 outline-none">
          <VehicleForm
            key={`${category}-${editingVehicle?.id ?? "new"}`}
            vehicle={editingVehicle}
            category={category}
            saving={saving}
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      )}

      <div className="space-y-3">
        {filteredVehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
          />
        ))}

        {filteredVehicles.length === 0 && !showNewForm && (
          <div className="text-center py-12 text-white/20 text-sm">
            {vehicles.length === 0
              ? `No ${label.toLowerCase()}s added yet. Click "+ Add ${label}" to start.`
              : `No ${label.toLowerCase()}s match the selected filters.`}
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  vehicle: Vehicle;
  onEdit: (v: Vehicle) => void;
  onDelete: (id: number) => void;
  onToggleVisibility: (v: Vehicle) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const specs = vehicle.specs || {};
  const vehicleUnits =
    specs.unitSystem === "metric" || specs.unitSystem === "imperial"
      ? (specs.unitSystem as "metric" | "imperial")
      : "metric";
  const specFields =
    vehicle.category === "car"
      ? getCarSpecFields(vehicleUnits)
      : getYachtSpecFields(vehicleUnits);
  const filledSpecs = specFields.filter((f) => specs[f.key]);
  const isHidden = vehicle.visible === false;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isHidden
          ? "bg-white/[0.01] border-white/[0.04] opacity-60"
          : "bg-white/[0.03] border-white/[0.06]"
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <img
            src={
              cleanImageUrl(vehicle.image) ||
              cleanImageUrl(vehicle.images?.[0] || "")
            }
            alt={stripTags(vehicle.name)}
            className={`w-20 h-14 object-cover rounded-md ${isHidden ? "grayscale" : ""}`}
            onError={(e) => {
              const fallback = cleanImageUrl(vehicle.images?.[0] || "");
              if (e.currentTarget.src !== fallback && fallback) {
                e.currentTarget.src = fallback;
              }
            }}
          />
          {(vehicle.images?.length || 0) > 1 && (
            <span className="absolute -top-1 -right-1 bg-[hsl(43,67%,55%)] text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {vehicle.images?.length}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-medium text-sm truncate">
              {stripTags(vehicle.name)}
            </h3>

            {isHidden && (
              <span className="text-[8px] uppercase tracking-[0.15em] bg-red-500/15 text-red-400/80 px-2 py-0.5 rounded-full border border-red-500/20">
                Hidden
              </span>
            )}

            {vehicle.featured && (
              <span className="text-[8px] uppercase tracking-[0.15em] bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)] px-2 py-0.5 rounded-full">
                Featured
              </span>
            )}

            {vehicle.translations &&
              Object.keys(vehicle.translations).length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400/70 border border-emerald-500/20">
                  {Object.keys(vehicle.translations).length} lang
                  {Object.keys(vehicle.translations).length > 1 ? "s" : ""}
                </span>
              )}
          </div>

          <p className="text-white/30 text-xs">
            {stripTags(vehicle.description)}
          </p>

          {filledSpecs.length > 0 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="text-[hsl(43,67%,55%)]/50 hover:text-[hsl(43,67%,55%)] text-[10px] mt-1 transition-colors"
            >
              {expanded ? "Hide specs ▲" : `${filledSpecs.length} specs ▼`}
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onToggleVisibility(vehicle)}
            className={`text-xs px-3 py-1.5 border rounded-md transition-colors ${
              isHidden
                ? "text-emerald-400/60 hover:text-emerald-400 border-emerald-400/15 hover:border-emerald-400/30"
                : "text-orange-400/50 hover:text-orange-400 border-orange-400/10 hover:border-orange-400/25"
            }`}
            title={isHidden ? "Show on site" : "Hide from site"}
          >
            {isHidden ? "Show" : "Hide"}
          </button>

          <button
            onClick={() => onEdit(vehicle)}
            className="text-white/30 hover:text-white/70 text-xs px-3 py-1.5 border border-white/[0.08] rounded-md transition-colors"
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(vehicle.id)}
            className="text-red-400/40 hover:text-red-400 text-xs px-3 py-1.5 border border-red-400/10 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && filledSpecs.length > 0 && (
        <div className="border-t border-white/[0.04] px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 bg-white/[0.01]">
          {filledSpecs.map((f) => (
            <div key={f.key}>
              <span className="text-[8px] uppercase tracking-[0.2em] text-white/20">
                {f.label}
              </span>
              <p className="text-white/60 text-xs">{stripTags(specs[f.key])}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleForm({
  vehicle,
  category,
  saving,
  onSave,
  onCancel,
}: {
  vehicle: Vehicle | null;
  category: string;
  saving: boolean;
  onSave: (data: {
    name: string;
    category: string;
    description: string;
    image: string;
    images: string[];
    featured: boolean;
    specs: Record<string, string>;
    translations?: Record<string, Record<string, string>>;
    ownership?: string;
    agentId?: number | null;
  }) => void;
  onCancel: () => void;
}) {
  const isCar = category === "car";
  const label = isCar ? "Car" : "Yacht";
  const MAX_IMAGES = 30;

  const [name, setName] = useState(vehicle?.name || "");
  const [ownership, setOwnership] = useState<"own" | "agent">(
    vehicle?.ownership === "agent" ? "agent" : "own",
  );
  const [agentId, setAgentId] = useState<number | null>(
    vehicle?.agentId ?? null,
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  useEffect(() => {
    if (ownership !== "agent" || !isCar) return;
    fetchAgents()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [ownership, isCar]);

  const selectedAgent = agents.find((a) => a.id === agentId) || null;
  const [description, setDescription] = useState(vehicle?.description || "");
  const [fullDescription, setFullDescription] = useState(
    () => vehicle?.specs?.fullDescription || "",
  );
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">(() => {
    const value = vehicle?.specs?.unitSystem;
    return value === "imperial" ? "imperial" : "metric";
  });

  const [vehicleTranslations, setVehicleTranslations] = useState<
    Record<string, Record<string, string>>
  >(() => {
    return vehicle?.translations
      ? JSON.parse(JSON.stringify(vehicle.translations))
      : {};
  });

  const [activeLang, setActiveLang] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState("");

  const activeSpecFields = isCar
    ? getCarSpecFields(unitSystem)
    : getYachtSpecFields(unitSystem);

  const [images, setImages] = useState<string[]>(() => {
    if (
      vehicle?.images &&
      Array.isArray(vehicle.images) &&
      vehicle.images.length > 0
    ) {
      const cleaned = vehicle.images.map(cleanImageUrl).filter(Boolean);
      if (cleaned.length > 0) return cleaned;
    }

    const fallback = cleanImageUrl(
      vehicle?.image || vehicle?.images?.[0] || "",
    );
    if (fallback) return [fallback];

    return [];
  });

  const [featured, setFeatured] = useState(vehicle?.featured ?? false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const defaultFields = isCar
      ? getCarSpecFields("metric")
      : getYachtSpecFields("metric");
    const initial: Record<string, string> = {};
    defaultFields.forEach((f) => {
      initial[f.key] = "";
    });
    if (vehicle?.specs) {
      Object.entries(vehicle.specs).forEach(([k, v]) => {
        initial[k] = v;
      });
    }
    return initial;
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCount, setUploadingCount] = useState(0);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      file = await compressImage(file, 800, 0.8);
      return cleanImageUrl(await uploadAdminPublicImage(file, "vehicles"));
    } catch (err) {
      console.error("UPLOAD ERROR:", err);

      if (err instanceof Error) {
        alert(`Upload crashed: ${err.message}`);
      } else {
        alert("Upload crashed: unknown error");
      }

      return null;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) return;

      const toUpload = Array.from(files).slice(0, remaining);
      setIsUploading(true);
      setUploadingCount(toUpload.length);
      setUploadProgress(0);

      const newUrls: string[] = [];

      for (let i = 0; i < toUpload.length; i += 1) {
        setUploadProgress(Math.round((i / toUpload.length) * 100));
        const url = await uploadFile(toUpload[i]);
        if (url) newUrls.push(cleanImageUrl(url));
      }

      setUploadProgress(100);

      if (newUrls.length > 0) {
        setImages((prev) =>
          Array.from(
            new Set(
              [...prev, ...newUrls]
                .map((img) => cleanImageUrl(img))
                .filter(Boolean),
            ),
          ),
        );
      }

      setIsUploading(false);
      setUploadingCount(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [images.length, uploadFile],
  );

  const addUrl = () => {
    const cleanedUrl = cleanImageUrl(urlInput);
    if (!cleanedUrl || images.length >= MAX_IMAGES) return;

    setImages((prev) =>
      Array.from(
        new Set(
          [...prev, cleanedUrl]
            .map((img) => cleanImageUrl(img))
            .filter(Boolean),
        ),
      ),
    );
    setUrlInput("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;

    setImages((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const updateSpec = (key: string, value: string) => {
    setSpecs((prev) => {
      const next = { ...prev, [key]: value };

      if (!isCar && key === "pricePerDay") {
        const num = parseFloat(stripTags(value).replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(num) && num > 0) {
          next.pricePerWeek = String(Math.round(num * 6));
        } else {
          next.pricePerWeek = "";
        }
      }

      return next;
    });
  };

  const getTranslatedField = (langCode: string, field: string) => {
    return vehicleTranslations[langCode]?.[field] || "";
  };

  const setTranslatedField = (
    langCode: string,
    field: string,
    value: string,
  ) => {
    setVehicleTranslations((prev) => ({
      ...prev,
      [langCode]: {
        ...(prev[langCode] || {}),
        [field]: value,
      },
    }));
  };

  const handleAutoTranslateVehicle = async () => {
    if (!name.trim() && !description.trim() && !fullDescription.trim()) return;

    setTranslating(true);
    setTranslateMsg("");

    try {
      const targetLangs = ADMIN_LANGS.filter((l) => l.code !== "en").map(
        (l) => l.code,
      );
      const results: Record<string, Record<string, string>> = {};

      const translationTasks: Promise<void>[] = [];

      if (name.trim()) {
        translationTasks.push(
          translateText(name, "en", targetLangs).then((r) => {
            Object.entries(r).forEach(([lang, val]) => {
              if (!results[lang]) results[lang] = {};
              results[lang].name = val;
            });
          }),
        );
      }

      if (description.trim()) {
        translationTasks.push(
          translateText(description, "en", targetLangs).then((r) => {
            Object.entries(r).forEach(([lang, val]) => {
              if (!results[lang]) results[lang] = {};
              results[lang].description = val;
            });
          }),
        );
      }

      if (fullDescription.trim()) {
        translationTasks.push(
          translateText(fullDescription, "en", targetLangs).then((r) => {
            Object.entries(r).forEach(([lang, val]) => {
              if (!results[lang]) results[lang] = {};
              results[lang].fullDescription = val;
            });
          }),
        );
      }

      await Promise.all(translationTasks);

      setVehicleTranslations((prev) => {
        const merged = { ...prev };
        Object.entries(results).forEach(([lang, fields]) => {
          merged[lang] = { ...(merged[lang] || {}), ...fields };
        });
        return merged;
      });

      setTranslateMsg("All languages translated!");
      setTimeout(() => setTranslateMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setTranslateMsg("Translation failed. Try again.");
      setTimeout(() => setTranslateMsg(""), 5000);
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslateSingleLang = async (targetLang: string) => {
    if (!name.trim() && !description.trim() && !fullDescription.trim()) return;

    setTranslating(true);
    setTranslateMsg("");

    try {
      const results: Record<string, string> = {};
      const tasks: Promise<void>[] = [];

      if (name.trim()) {
        tasks.push(
          translateText(name, "en", [targetLang]).then((r) => {
            results.name = r[targetLang] || "";
          }),
        );
      }

      if (description.trim()) {
        tasks.push(
          translateText(description, "en", [targetLang]).then((r) => {
            results.description = r[targetLang] || "";
          }),
        );
      }

      if (fullDescription.trim()) {
        tasks.push(
          translateText(fullDescription, "en", [targetLang]).then((r) => {
            results.fullDescription = r[targetLang] || "";
          }),
        );
      }

      await Promise.all(tasks);

      setVehicleTranslations((prev) => ({
        ...prev,
        [targetLang]: {
          ...(prev[targetLang] || {}),
          ...results,
        },
      }));

      setTranslateMsg(
        `Translated to ${ADMIN_LANGS.find((l) => l.code === targetLang)?.label}`,
      );
      setTimeout(() => setTranslateMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setTranslateMsg("Translation failed.");
      setTimeout(() => setTranslateMsg(""), 5000);
    } finally {
      setTranslating(false);
    }
  };

  const translationCount = () => {
    return Object.values(vehicleTranslations).filter((langData) =>
      Object.values(langData).some((v) => v && v.trim()),
    ).length;
  };

  const handleSubmit = () => {
    const cleanSpecs: Record<string, string> = {};

    Object.entries(specs).forEach(([k, v]) => {
      if (k === "fullDescription" || k === "unitSystem") return;
      // Strip HTML before checking truthiness — RichTextEditor emits "<p></p>"
      // for empty fields which is truthy but produces no visible content.
      if (stripTags(v).trim()) cleanSpecs[k] = v.trim();
    });

    if (fullDescription.trim())
      cleanSpecs.fullDescription = fullDescription.trim();
    cleanSpecs.unitSystem = unitSystem;

    const cleanedImages = Array.from(
      new Set(images.map((img) => cleanImageUrl(img)).filter(Boolean)),
    );
    const mainImage = cleanImageUrl(cleanedImages[0] || "");

    const cleanTranslations: Record<string, Record<string, string>> = {};
    Object.entries(vehicleTranslations).forEach(([lang, fields]) => {
      const cleanFields: Record<string, string> = {};

      Object.entries(fields).forEach(([k, v]) => {
        const cleanedValue = v.trim();

        if (cleanedValue) {
          cleanFields[k] = cleanedValue;
        }
      });

      if (Object.keys(cleanFields).length > 0) {
        cleanTranslations[lang] = cleanFields;
      }
    });

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      image: mainImage,
      images: cleanedImages,
      featured,
      specs: cleanSpecs,
      ...(isCar
        ? { ownership, agentId: ownership === "agent" ? agentId : null }
        : {}),
      ...(Object.keys(cleanTranslations).length > 0
        ? { translations: cleanTranslations }
        : {}),
    };

    onSave(payload);
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 mb-6">
      <h3 className="text-white font-serif text-lg mb-5">
        {vehicle ? `Edit ${label}` : `New ${label}`}
      </h3>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-1 mb-3">
          {ADMIN_LANGS.map((l) => {
            const hasTranslation =
              l.code === "en"
                ? !!(
                    name.trim() ||
                    description.trim() ||
                    fullDescription.trim()
                  )
                : !!(
                    vehicleTranslations[l.code]?.name?.trim() ||
                    vehicleTranslations[l.code]?.description?.trim() ||
                    vehicleTranslations[l.code]?.fullDescription?.trim()
                  );

            return (
              <button
                key={l.code}
                onClick={() => setActiveLang(l.code)}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors ${
                  activeLang === l.code
                    ? "bg-[hsl(43,67%,55%)] text-black font-medium"
                    : hasTranslation
                      ? "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
                      : "bg-white/[0.02] text-white/25 hover:bg-white/[0.06] border border-dashed border-white/[0.08]"
                }`}
              >
                {l.flag} {l.code}
              </button>
            );
          })}

          {translationCount() > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400/70 border border-emerald-500/20 ml-1">
              {translationCount()} lang{translationCount() > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleAutoTranslateVehicle}
            disabled={
              translating ||
              (!name.trim() && !description.trim() && !fullDescription.trim())
            }
            className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-30 transition-colors border border-blue-500/20"
          >
            {translating ? "Translating..." : "Auto-translate All"}
          </button>

          {activeLang !== "en" && (
            <button
              onClick={() => handleTranslateSingleLang(activeLang)}
              disabled={
                translating ||
                (!name.trim() && !description.trim() && !fullDescription.trim())
              }
              className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors border border-emerald-500/20"
            >
              {translating ? "..." : `Translate → ${activeLang.toUpperCase()}`}
            </button>
          )}

          {translateMsg && (
            <span className="text-[10px] text-emerald-400/80">
              {translateMsg}
            </span>
          )}
        </div>
      </div>

      {activeLang === "en" ? (
        <>
          <div className="mb-5">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light block mb-1.5">
              Name
            </label>
            <RichTextEditor
              content={convertPlainToHtml(name)}
              onChange={setName}
              inline
            />
          </div>

          <div className="mb-5">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light block mb-1.5">
              Short Description
            </label>
            <RichTextEditor
              content={convertPlainToHtml(description)}
              onChange={setDescription}
              inline
            />
          </div>

          <div className="mb-5">
            <label className="block text-[9px] uppercase tracking-[0.3em] text-white/40 font-light mb-2">
              Full Description
            </label>
            <RichTextEditor
              content={convertPlainToHtml(fullDescription)}
              onChange={setFullDescription}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mb-5">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light block mb-1.5">
              Name ({ADMIN_LANGS.find((l) => l.code === activeLang)?.label})
            </label>
            <RichTextEditor
              key={`name-${activeLang}`}
              content={convertPlainToHtml(
                getTranslatedField(activeLang, "name"),
              )}
              onChange={(html) => setTranslatedField(activeLang, "name", html)}
              inline
            />
          </div>

          <div className="mb-5">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light block mb-1.5">
              Short Description (
              {ADMIN_LANGS.find((l) => l.code === activeLang)?.label})
            </label>
            <RichTextEditor
              key={`desc-${activeLang}`}
              content={convertPlainToHtml(
                getTranslatedField(activeLang, "description"),
              )}
              onChange={(html) =>
                setTranslatedField(activeLang, "description", html)
              }
              inline
            />
          </div>

          <div className="mb-5">
            <label className="block text-[9px] uppercase tracking-[0.3em] text-white/40 font-light mb-2">
              Full Description (
              {ADMIN_LANGS.find((l) => l.code === activeLang)?.label})
            </label>
            <RichTextEditor
              key={`full-${activeLang}`}
              content={convertPlainToHtml(
                getTranslatedField(activeLang, "fullDescription"),
              )}
              onChange={(html) =>
                setTranslatedField(activeLang, "fullDescription", html)
              }
            />
          </div>

          {name && (
            <div className="mb-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-md">
              <p className="text-[8px] uppercase tracking-[0.3em] text-white/25 mb-1">
                English Original
              </p>
              <p className="text-white/40 text-xs">
                {stripTags(name)} — {stripTags(description)}
              </p>
            </div>
          )}
        </>
      )}

      <div className="mb-5">
        <label className="block text-[9px] uppercase tracking-[0.3em] text-white/40 font-light mb-2">
          Unit System
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setUnitSystem("metric")}
            className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.15em] border transition-colors ${
              unitSystem === "metric"
                ? "bg-[hsl(43,67%,55%)]/20 border-[hsl(43,67%,55%)]/40 text-[hsl(43,67%,55%)]"
                : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60"
            }`}
          >
            Metric (km, m, L, kg)
          </button>

          <button
            type="button"
            onClick={() => setUnitSystem("imperial")}
            className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.15em] border transition-colors ${
              unitSystem === "imperial"
                ? "bg-[hsl(43,67%,55%)]/20 border-[hsl(43,67%,55%)]/40 text-[hsl(43,67%,55%)]"
                : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60"
            }`}
          >
            Imperial (mi, ft, gal, lb)
          </button>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light">
            Photos ({images.length}/{MAX_IMAGES})
          </label>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-3">
            {images.map((img, idx) => (
              <div
                key={`${img}-${idx}`}
                className="relative group aspect-[4/3] rounded-md overflow-hidden border border-white/[0.08]"
              >
                <img
                  src={cleanImageUrl(img)}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0.25";
                  }}
                />

                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-[hsl(43,67%,55%)] text-black text-[7px] font-bold px-1.5 py-0.5 rounded uppercase">
                    Cover
                  </span>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => moveImage(idx, -1)}
                      className="font-porter w-6 h-6 bg-white/20 rounded text-white text-xs hover:bg-white/40 transition-colors flex items-center justify-center"
                    >
                      ←
                    </button>
                  )}

                  {idx < images.length - 1 && (
                    <button
                      onClick={() => moveImage(idx, 1)}
                      className="font-porter w-6 h-6 bg-white/20 rounded text-white text-xs hover:bg-white/40 transition-colors flex items-center justify-center"
                    >
                      →
                    </button>
                  )}

                  <button
                    onClick={() => removeImage(idx)}
                    className="w-6 h-6 bg-red-500/60 rounded text-white text-xs hover:bg-red-500 transition-colors flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length < MAX_IMAGES && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isUploading
                  ? "border-[hsl(43,67%,55%)]/30 bg-[hsl(43,67%,55%)]/5"
                  : "border-white/[0.08] hover:border-[hsl(43,67%,55%)]/20 hover:bg-white/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {isUploading ? (
                <div>
                  <div className="w-48 h-1.5 bg-white/[0.06] rounded-full mx-auto mb-2 overflow-hidden">
                    <div
                      className="h-full bg-[hsl(43,67%,55%)] rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[hsl(43,67%,55%)]/60 text-xs">
                    Uploading {uploadingCount} photo
                    {uploadingCount > 1 ? "s" : ""}... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-white/40 text-sm mb-1">
                    Click to add photos (select multiple)
                  </p>
                  <p className="text-white/20 text-[10px]">
                    JPG, PNG, WebP — up to {MAX_IMAGES - images.length} more
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addUrl();
                }}
                className="flex-1 h-11 bg-black/40 border border-white/[0.08] rounded-md px-3 text-white text-sm focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
                placeholder="Or paste image URL and press Add"
              />
              <button
                type="button"
                onClick={addUrl}
                disabled={!urlInput.trim() || images.length >= MAX_IMAGES}
                className="px-3 h-11 bg-white/[0.06] border border-white/[0.08] rounded-md text-white/50 hover:text-white text-[10px] uppercase tracking-[0.15em] disabled:opacity-30 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="w-4 h-4 accent-[hsl(43,67%,55%)]"
          />
          <span className="text-white/50 text-sm">
            Show on homepage (featured)
          </span>
        </label>
      </div>

      {isCar && (
        <div className="mb-6">
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-2">
            Ownership
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setOwnership("own")}
              className={`min-h-[44px] px-4 rounded-md text-xs uppercase tracking-wide border transition-colors ${
                ownership === "own"
                  ? "bg-[hsl(43,67%,55%)]/15 border-[hsl(43,67%,55%)]/40 text-[hsl(43,67%,55%)]"
                  : "border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              Our vehicle
            </button>
            <button
              type="button"
              onClick={() => setOwnership("agent")}
              className={`min-h-[44px] px-4 rounded-md text-xs uppercase tracking-wide border transition-colors ${
                ownership === "agent"
                  ? "bg-[hsl(43,67%,55%)]/15 border-[hsl(43,67%,55%)]/40 text-[hsl(43,67%,55%)]"
                  : "border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              Agent vehicle
            </button>
          </div>

          {ownership === "agent" && (
            <div className="mt-4">
              <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-2">
                Agent
              </label>
              <select
                value={agentId ?? ""}
                onChange={(e) =>
                  setAgentId(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-md px-3 text-white text-sm focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
              >
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {selectedAgent && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAgentDetails((s) => !s)}
                    className="text-[11px] uppercase tracking-wide text-[hsl(43,67%,55%)]/70 hover:text-[hsl(43,67%,55%)] transition-colors"
                  >
                    {showAgentDetails ? "Hide" : "View"} agent details
                  </button>
                  {showAgentDetails && (
                    <div className="mt-2 bg-white/[0.03] border border-white/[0.06] rounded-md p-3 text-xs text-white/60 space-y-1">
                      {selectedAgent.phone && (
                        <p>Phone: {selectedAgent.phone}</p>
                      )}
                      {selectedAgent.email && (
                        <p>Email: {selectedAgent.email}</p>
                      )}
                      {selectedAgent.address && (
                        <p>Address: {selectedAgent.address}</p>
                      )}
                      {!selectedAgent.phone &&
                        !selectedAgent.email &&
                        !selectedAgent.address && (
                          <p className="text-white/30">
                            No further details on file.
                          </p>
                        )}
                    </div>
                  )}
                </div>
              )}
              {agents.length === 0 && (
                <p className="text-[11px] text-white/30 mt-2">
                  No agents yet — add one from the Agents section first.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-5 mb-5">
        <h4 className="text-[10px] uppercase tracking-[0.3em] text-[hsl(43,67%,55%)]/60 font-light mb-4">
          {isCar ? "Technical Specifications" : "Yacht Specifications"}
        </h4>

        {!isCar && (
          <div className="mb-4">
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-light block mb-1.5">
              Pricing Type
            </label>
            <div className="flex gap-2">
              {[
                { value: "", label: "Not set" },
                { value: "plus APA", label: "+ APA" },
                { value: "All included", label: "All Included" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSpec("pricingType", opt.value)}
                  className={`px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.15em] border transition-colors ${
                    (specs.pricingType || "") === opt.value
                      ? "bg-[hsl(43,67%,55%)]/20 border-[hsl(43,67%,55%)]/40 text-[hsl(43,67%,55%)]"
                      : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <SharedToolbarGroup
          fields={activeSpecFields
            .filter((f) => f.key !== "pricingType")
            .map((f) => ({
              key: f.key,
              label: f.label,
              content: convertPlainToHtml(specs[f.key] || ""),
              onChange: (html: string) => updateSpec(f.key, html),
            }))}
        />
      </div>

      <div className="flex gap-3 sticky bottom-0 z-10 -mx-6 -mb-6 px-6 py-4 bg-[hsl(0,0%,3%)]/95 backdrop-blur-sm border-t border-white/[0.08] lg:static lg:mx-0 lg:mb-0 lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0">
        <button
          onClick={handleSubmit}
          disabled={saving || !stripTags(name) || images.length === 0}
          className="min-h-[44px] bg-[hsl(43,67%,55%)] text-black px-5 py-2.5 rounded-md text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={onCancel}
          className="min-h-[44px] text-white/30 hover:text-white/60 px-5 py-2.5 border border-white/[0.08] rounded-md text-[10px] uppercase tracking-[0.2em] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContentTab({
  content,
  editingContent,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  content: ContentItem[];
  editingContent: ContentItem | null;
  saving: boolean;
  onEdit: (c: ContentItem) => void;
  onCancel: () => void;
  onSave: (
    key: string,
    value: string,
    translations?: Record<string, string>,
  ) => void;
}) {
  const [editValue, setEditValue] = useState("");
  const [editTranslations, setEditTranslations] = useState<
    Record<string, string>
  >({});
  const [activeLang, setActiveLang] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingOfficePhoto, setUploadingOfficePhoto] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  useEffect(() => {
    if (!editingContent) return;
    setEditValue(editingContent.value);
    setEditTranslations(
      editingContent.translations ? { ...editingContent.translations } : {},
    );
    setActiveLang("en");
    setTranslateMsg("");
  }, [editingContent]);

  const keyLabels: Record<string, string> = {
    hero_title: "Hero Title (Slogan)",
    hero_tagline: "Hero Tagline",
    hero_subtitle: "Hero Subtitle",
    hero_background: "Home Hero Background",
    about_title: "About Us — Title",
    about_slogan: "About Us — Slogan",
    about_text: "About Us — Main Text",
    about_background: "About Page Background",
    yacht_section_title: "Yacht Section Title",
    yacht_section_subtitle: "Yacht Section Subtitle",
    yacht_section_desc: "Yacht Section Description",
    yacht_section_bg: "Yacht Section Background (URL)",
    car_section_title: "Car Section Title",
    car_section_subtitle: "Car Section Subtitle",
    car_section_desc: "Car Section Description",
    car_section_bg: "Car Section Background (URL)",
    collection_title: "Collection Title",
    collection_subtitle: "Collection Subtitle",
    form_title: "Contact Form Title",
    form_subtitle: "Contact Form Subtitle",
    form_desc: "Contact Form Description",
    phone_number: "Phone Number",
    whatsapp_number: "WhatsApp Number",
    admin_email: "Admin Email (receives contact form submissions)",
    footer_desc: "Footer Description",
    office_photos: "Office Location Photos",
    privacy_policy_content: "Privacy Policy Content",
    legal_notice_content: "Legal Notice Content",
  };

  const plainTextKeys = new Set([
    "phone_number",
    "whatsapp_number",
    "admin_email",
    "hero_background",
    "about_background",
    "yacht_section_bg",
    "car_section_bg",
    "office_photos",
  ]);
  const isBackgroundImageKey = (key: string) =>
    key === "hero_background" ||
    key === "about_background" ||
    key === "yacht_section_bg" ||
    key === "car_section_bg";
  const isPhotoArrayKey = (key: string) => key === "office_photos";
  const isRichText = (key: string) => !plainTextKeys.has(key);

  const getPreviewHtml = (item: ContentItem) => {
    if (!isRichText(item.key)) return "";
    const html = item.value.trim().startsWith("<")
      ? item.value
      : convertPlainToHtml(item.value);
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["style"],
    });
  };

  const currentEditText =
    activeLang === "en" ? editValue : editTranslations[activeLang] || "";

  const setCurrentEditText = (val: string) => {
    if (activeLang === "en") {
      setEditValue(val);
    } else {
      setEditTranslations((prev) => ({
        ...prev,
        [activeLang]: val,
      }));
    }
  };
  const handleBgUpload = async (file: File, key: string) => {
    setUploadingBg(true);
    setUploadMsg("");

    try {
      file = await compressImage(file, 800, 0.8);
      const previousUrl = currentEditText.trim();
      const url = cleanImageUrl(await uploadAdminPublicImage(file, "content-bg"));
      if (previousUrl && previousUrl !== url) {
        await deleteAdminPublicImage(previousUrl).catch(() => undefined);
      }
      setCurrentEditText(url);
      onSave(key, url);
      setUploadMsg("Image compressed, replaced and saved");
      setTimeout(() => setUploadMsg(""), 3000);
    } catch (err) {
      console.error("BG UPLOAD ERROR:", err);
      setUploadMsg(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed",
      );
      setTimeout(() => setUploadMsg(""), 4000);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleBgDelete = async (key: string) => {
    const currentUrl = currentEditText.trim();
    setUploadingBg(true);
    setUploadMsg("");
    try {
      if (currentUrl) await deleteAdminPublicImage(currentUrl);
      setCurrentEditText("");
      onSave(key, "");
      setUploadMsg("Background removed");
      setTimeout(() => setUploadMsg(""), 3000);
    } catch (err) {
      setUploadMsg(
        err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed",
      );
      setTimeout(() => setUploadMsg(""), 4000);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleOfficePhotoUpload = async (file: File) => {
    setUploadingOfficePhoto(true);
    setUploadMsg("");
    try {
      file = await compressImage(file, 800, 0.8);
      const url = cleanImageUrl(
        await uploadAdminPublicImage(file, "content-office"),
      );
      try {
        const arr: string[] = JSON.parse(editValue || "[]");
        setEditValue(JSON.stringify([...arr, url]));
      } catch {
        setEditValue(JSON.stringify([url]));
      }
      setUploadMsg("Photo added — click Save to apply");
      setTimeout(() => setUploadMsg(""), 4000);
    } catch (err) {
      setUploadMsg(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed",
      );
      setTimeout(() => setUploadMsg(""), 4000);
    } finally {
      setUploadingOfficePhoto(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!editValue.trim()) return;
    setTranslating(true);
    setTranslateMsg("");

    try {
      const targetLangs = ADMIN_LANGS.filter((l) => l.code !== "en").map(
        (l) => l.code,
      );
      const results = await translateText(editValue, "en", targetLangs);
      setEditTranslations((prev) => ({ ...prev, ...results }));
      setTranslateMsg("All languages translated!");
      setTimeout(() => setTranslateMsg(""), 3000);
    } catch {
      setTranslateMsg("Translation failed. Try again.");
    } finally {
      setTranslating(false);
    }
  };

  const handleTranslateSingle = async (targetLang: string) => {
    if (!editValue.trim()) return;
    setTranslating(true);
    setTranslateMsg("");

    try {
      const results = await translateText(editValue, "en", [targetLang]);
      setEditTranslations((prev) => ({ ...prev, ...results }));
      setTranslateMsg(
        `Translated to ${ADMIN_LANGS.find((l) => l.code === targetLang)?.label}`,
      );
      setTimeout(() => setTranslateMsg(""), 3000);
    } catch {
      setTranslateMsg("Translation failed.");
      setTimeout(() => setTranslateMsg(""), 5000);
    } finally {
      setTranslating(false);
    }
  };

  const handleSaveWithTranslations = (key: string) => {
    const cleanedTranslations = Object.fromEntries(
      Object.entries(editTranslations).filter(([, v]) => v && v.trim()),
    );
    onSave(
      key,
      editValue,
      Object.keys(cleanedTranslations).length > 0
        ? cleanedTranslations
        : undefined,
    );
  };

  const handleSaveCurrentLang = (key: string) => {
    if (activeLang === "en") {
      onSave(key, editValue);
      return;
    }

    const langTranslation = editTranslations[activeLang];
    if (langTranslation && langTranslation.trim()) {
      onSave(key, editValue, { [activeLang]: langTranslation });
    }
  };

  const translatable = (key: string) => !NON_TRANSLATABLE.has(key);

  const aboutKeys = new Set(["about_title", "about_slogan", "about_text"]);
  const backgroundKeys = new Set([
    "hero_background",
    "about_background",
    "yacht_section_bg",
    "car_section_bg",
  ]);
  const legalKeys = new Set(["privacy_policy_content", "legal_notice_content"]);

  const aboutItems = content.filter((i) => aboutKeys.has(i.key));
  const legalItems = content.filter((i) => legalKeys.has(i.key));
  const otherItems = content.filter(
    (i) =>
      !aboutKeys.has(i.key) &&
      !legalKeys.has(i.key) &&
      !backgroundKeys.has(i.key),
  );

  const translationCount = (item: ContentItem) => {
    if (!item.translations) return 0;
    return Object.values(item.translations).filter((v) => v && v.trim()).length;
  };

  const renderContentItem = (item: ContentItem) => (
    <div
      key={item.id}
      className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4"
    >
      {editingContent?.id === item.id ? (
        <div>
          <label className="text-[9px] uppercase tracking-[0.3em] text-[hsl(43,67%,55%)]/60 font-light block mb-2">
            {keyLabels[item.key] || item.key}
          </label>

          {translatable(item.key) && (
            <div className="mb-3">
              <div className="flex flex-wrap items-center gap-1 mb-2">
                {ADMIN_LANGS.map((l) => {
                  const hasValue =
                    l.code === "en"
                      ? !!editValue.trim()
                      : !!editTranslations[l.code]?.trim();
                  return (
                    <button
                      key={l.code}
                      onClick={() => setActiveLang(l.code)}
                      className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors ${
                        activeLang === l.code
                          ? "bg-[hsl(43,67%,55%)] text-black font-medium"
                          : hasValue
                            ? "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
                            : "bg-white/[0.02] text-white/25 hover:bg-white/[0.06] border border-dashed border-white/[0.08]"
                      }`}
                    >
                      {l.flag} {l.code}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleAutoTranslate}
                  disabled={translating || !editValue.trim()}
                  className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-30 transition-colors border border-blue-500/20"
                >
                  {translating ? "Translating..." : "Auto-translate All"}
                </button>

                {activeLang !== "en" && (
                  <button
                    onClick={() => handleTranslateSingle(activeLang)}
                    disabled={translating || !editValue.trim()}
                    className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors border border-emerald-500/20"
                  >
                    {translating
                      ? "..."
                      : `Translate → ${activeLang.toUpperCase()}`}
                  </button>
                )}

                {translateMsg && (
                  <span className="text-[10px] text-emerald-400/80">
                    {translateMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {isBackgroundImageKey(item.key) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/60 cursor-pointer hover:bg-white/[0.07] transition-colors">
                {uploadingBg ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleBgUpload(file, item.key);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              {!!currentEditText.trim() && (
                <button
                  type="button"
                  onClick={() => handleBgDelete(item.key)}
                  disabled={uploadingBg || saving}
                  className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 disabled:opacity-40 transition-colors"
                >
                  Delete Background
                </button>
              )}

              {uploadMsg && (
                <span className="text-[10px] text-emerald-400/80">
                  {uploadMsg}
                </span>
              )}
            </div>
          )}

          {isPhotoArrayKey(item.key) ? (
            <div>
              {(() => {
                let arr: string[] = [];
                try {
                  arr = JSON.parse(editValue || "[]");
                } catch {}
                return arr.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {arr.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[4/3] rounded overflow-hidden border border-white/[0.06] group"
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            try {
                              const a: string[] = JSON.parse(editValue || "[]");
                              setEditValue(
                                JSON.stringify(a.filter((_, i) => i !== idx)),
                              );
                            } catch {}
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-xs mb-3">
                    No photos uploaded yet.
                  </p>
                );
              })()}
              <label className="text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/60 cursor-pointer hover:bg-white/[0.07] transition-colors inline-flex items-center gap-2">
                {uploadingOfficePhoto ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleOfficePhotoUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {uploadMsg && (
                <span className="text-[10px] text-emerald-400/80 ml-2">
                  {uploadMsg}
                </span>
              )}
            </div>
          ) : isBackgroundImageKey(item.key) ? (
            <input
              type="text"
              value={currentEditText}
              onChange={(e) => setCurrentEditText(e.target.value)}
              placeholder="Paste image URL or upload a file"
              className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
            />
          ) : isRichText(item.key) ? (
            <RichTextEditor
              key={`content-${activeLang}`}
              content={convertPlainToHtml(currentEditText)}
              onChange={setCurrentEditText}
            />
          ) : (
            <RichTextEditor
              key={`plain-${activeLang}`}
              content={convertPlainToHtml(currentEditText)}
              onChange={setCurrentEditText}
              inline
            />
          )}

          <div className="flex flex-wrap gap-3 mt-3">
            <button
              onClick={() => handleSaveCurrentLang(item.key)}
              disabled={saving}
              className="bg-[hsl(43,67%,55%)] text-black px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving..."
                : `Save ${
                    activeLang === "en"
                      ? "English"
                      : ADMIN_LANGS.find((l) => l.code === activeLang)?.label
                  }`}
            </button>

            {translatable(item.key) && (
              <button
                onClick={() => handleSaveWithTranslations(item.key)}
                disabled={saving}
                className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors border border-blue-500/20"
              >
                {saving ? "Saving..." : "Save All Languages"}
              </button>
            )}

            <button
              onClick={onCancel}
              className="text-white/30 hover:text-white/60 px-4 py-2 border border-white/[0.08] rounded-md text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-light">
                {keyLabels[item.key] || item.key}
              </p>

              {translatable(item.key) && translationCount(item) > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400/70 border border-emerald-500/20">
                  {translationCount(item)} lang
                  {translationCount(item) > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isRichText(item.key) ? (
              <div
                className="text-white/70 text-sm rich-text-preview"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml(item) }}
              />
            ) : (
              <p className="text-white/70 text-sm whitespace-pre-line">
                {stripTags(item.value)}
              </p>
            )}
          </div>

          <button
            onClick={() => onEdit(item)}
            className="text-white/30 hover:text-white/70 text-xs px-3 py-1.5 border border-white/[0.08] rounded-md transition-colors flex-shrink-0"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {aboutItems.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-xl text-white mb-2">About Us</h2>
          <p className="text-white/30 text-xs mb-4">
            Slogan and main text displayed on the About Us page
          </p>
          <div className="space-y-3">{aboutItems.map(renderContentItem)}</div>
        </div>
      )}

      {legalItems.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-xl text-white mb-2">Legal Pages</h2>
          <p className="text-white/30 text-xs mb-4">
            Privacy Policy and Legal Notice pages
          </p>
          <div className="space-y-3">{legalItems.map(renderContentItem)}</div>
        </div>
      )}

      <h2 className="font-serif text-xl text-white mb-6">Site Text Content</h2>
      <div className="space-y-3">
        {otherItems
          .filter((item) => !backgroundKeys.has(item.key))
          .map(renderContentItem)}
      </div>

      {/* 👉 НОВЫЙ БЛОК */}
      <div className="mt-10">
        <h2 className="font-serif text-xl text-white mb-2">
          Page & Category Backgrounds
        </h2>
        <p className="text-white/30 text-xs mb-4">
          Background images for the home hero, About page, yacht section and
          car section
        </p>

        <div className="space-y-3">
          {content
            .filter((item) => backgroundKeys.has(item.key))
            .map(renderContentItem)}
        </div>
      </div>
    </div>
  );
}

function RequestsTab({
  requests,
  onUpdate,
  onDelete,
}: {
  requests: ContactRequest[];
  onUpdate: (r: ContactRequest) => void;
  onDelete: (id: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ContactRequest>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const interestLabels: Record<string, string> = {
    yacht: "Superyacht Charter",
    car: "Hypercar Rental",
    both: "Combined Experience",
    private: "Off-Market Request",
  };

  const startEdit = (r: ContactRequest) => {
    setEditingId(r.id);
    setEditData({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone || "",
      interest: r.interest || "",
      message: r.message,
      status: r.status || "new",
    });
    setConfirmDeleteId(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await updateRequest(editingId, editData);
      onUpdate(updated);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteRequest(id);
      onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    viewed: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    contacted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    closed: "bg-white/5 text-white/40 border-white/10",
  };

  return (
    <div>
      <h2 className="font-serif text-xl text-white mb-6">
        Contact Requests ({requests.length})
      </h2>

      {requests.length === 0 ? (
        <p className="text-white/40 text-sm">No requests yet.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5"
            >
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="First Name"
                      value={editData.firstName || ""}
                      onChange={(val) =>
                        setEditData((d) => ({ ...d, firstName: val }))
                      }
                    />
                    <InputField
                      label="Last Name"
                      value={editData.lastName || ""}
                      onChange={(val) =>
                        setEditData((d) => ({ ...d, lastName: val }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Email"
                      value={editData.email || ""}
                      onChange={(val) =>
                        setEditData((d) => ({ ...d, email: val }))
                      }
                    />
                    <InputField
                      label="Phone"
                      value={editData.phone || ""}
                      onChange={(val) =>
                        setEditData((d) => ({ ...d, phone: val }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light block mb-1">
                        Interest
                      </label>
                      <select
                        value={editData.interest || ""}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            interest: e.target.value,
                          }))
                        }
                        className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
                      >
                        <option value="">General</option>
                        <option value="yacht">Superyacht Charter</option>
                        <option value="car">Hypercar Rental</option>
                        <option value="both">Combined Experience</option>
                        <option value="private">Off-Market Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light block mb-1">
                        Status
                      </label>
                      <select
                        value={editData.status || "new"}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, status: e.target.value }))
                        }
                        className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
                      >
                        <option value="new">New</option>
                        <option value="viewed">Viewed</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light block mb-1">
                      Message
                    </label>
                    <textarea
                      value={editData.message || ""}
                      onChange={(e) =>
                        setEditData((d) => ({ ...d, message: e.target.value }))
                      }
                      rows={4}
                      className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[hsl(43,67%,55%)]/30 resize-y"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)] px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,55%)]/30 disabled:opacity-50 transition-colors border border-[hsl(43,67%,55%)]/20"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <button
                      onClick={() => setEditingId(null)}
                      className="text-white/30 hover:text-white/60 px-4 py-2 border border-white/[0.08] rounded-md text-[10px] uppercase tracking-[0.2em] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-medium">
                        {r.firstName} {r.lastName}
                      </h3>
                      <p className="text-white/50 text-sm">
                        {r.email}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                            statusColors[r.status || "new"] || statusColors.new
                          }`}
                        >
                          {r.status || "new"}
                        </span>

                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[hsl(43,67%,55%)]/10 text-[hsl(43,67%,55%)] border border-[hsl(43,67%,55%)]/20">
                          {r.interest
                            ? interestLabels[r.interest] || r.interest
                            : "General"}
                        </span>
                      </div>

                      <p className="text-white/30 text-xs mt-1">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm whitespace-pre-wrap mb-3">
                    {r.message}
                  </p>

                  <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-white/40 hover:text-white/70 text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 border border-white/[0.08] rounded transition-colors mt-2"
                    >
                      Edit
                    </button>

                    {confirmDeleteId === r.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-red-400/70 text-[10px]">
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-red-400 hover:text-red-300 text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 border border-red-500/30 rounded bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === r.id ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-white/40 hover:text-white/70 text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 border border-white/[0.08] rounded transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="text-red-400/40 hover:text-red-400/70 text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 border border-red-500/10 rounded transition-colors mt-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      let from: string | undefined;

      if (range !== "all") {
        const d = new Date();
        d.setDate(
          d.getDate() - (range === "7d" ? 7 : range === "30d" ? 30 : 90),
        );
        from = d.toISOString();
      }

      const data = await fetchAnalyticsStats(from);
      setStats(data as AnalyticsStats);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[hsl(43,67%,55%)]/30 border-t-[hsl(43,67%,55%)] rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-white/40 text-sm text-center py-12">
        Failed to load analytics data.
      </p>
    );
  }

  const {
    overview,
    dailyChart = [],
    hourlyBreakdown = [],
    pageBreakdown = {},
    referrerBreakdown = {},
    deviceBreakdown = { desktop: 0, tablet: 0, mobile: 0 },
    browserBreakdown = {},
    languageBreakdown = {},
    vehicleViewBreakdown = {},
  } = stats;

  const maxDailyViews = Math.max(...dailyChart.map((d) => d.views), 1);
  const maxHourlyViews = Math.max(...hourlyBreakdown.map((h) => h.views), 1);

  const sortedPages = Object.entries(pageBreakdown).sort(
    ([, a], [, b]) => b - a,
  );
  const sortedReferrers = Object.entries(referrerBreakdown).sort(
    ([, a], [, b]) => b - a,
  );
  const sortedBrowsers = Object.entries(browserBreakdown).sort(
    ([, a], [, b]) => b - a,
  );
  const sortedLangs = Object.entries(languageBreakdown).sort(
    ([, a], [, b]) => b - a,
  );
  const sortedVehicles = Object.entries(vehicleViewBreakdown).sort(
    ([, a], [, b]) => b - a,
  );

  const totalDevices =
    (deviceBreakdown.desktop || 0) +
    (deviceBreakdown.tablet || 0) +
    (deviceBreakdown.mobile || 0);

  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const pageLabels: Record<string, string> = {
    "/": "Home",
    "/about": "About",
    "/cars": "Cars Catalog",
    "/yachts": "Yachts Catalog",
  };

  const getPageLabel = (p: string) => {
    if (pageLabels[p]) return pageLabels[p];
    const match = p.match(/^\/vehicle\/(\d+)/);
    if (match) return `Vehicle #${match[1]}`;
    return p;
  };

  const barColor = "hsl(43,67%,55%)";
  const barColorAlt = "hsl(200,70%,55%)";
  const barColorGreen = "hsl(150,60%,45%)";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-white">
          Analytics & Conversions
        </h2>

        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] rounded-md transition-colors ${
                range === r
                  ? "bg-[hsl(43,67%,55%)]/20 text-[hsl(43,67%,55%)] border border-[hsl(43,67%,55%)]/20"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {r === "all" ? "All Time" : r}
            </button>
          ))}

          <button
            onClick={() => void loadStats()}
            className="px-2 py-1.5 text-white/30 hover:text-white/60 transition-colors"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          {
            label: "Page Views",
            value: overview.totalPageViews,
            color: "text-white",
          },
          {
            label: "Unique Visitors",
            value: overview.uniqueVisitors,
            color: "text-blue-400",
          },
          {
            label: "Bounce Rate",
            value: `${overview.bounceRate}%`,
            color:
              overview.bounceRate > 70 ? "text-red-400" : "text-emerald-400",
          },
          {
            label: "Avg. Session",
            value: formatDuration(overview.avgSessionDuration),
            color: "text-yellow-400",
          },
          {
            label: "Pages / Session",
            value: overview.pagesPerSession,
            color: "text-violet-400",
          },
          {
            label: "Form Submissions",
            value: overview.formSubmissions,
            color: "text-emerald-400",
          },
          {
            label: "Conversion Rate",
            value: `${overview.conversionRate}%`,
            color:
              overview.conversionRate > 5
                ? "text-emerald-400"
                : "text-orange-400",
          },
          {
            label: "Total Requests",
            value: overview.totalRequests,
            color: "text-[hsl(43,67%,55%)]",
          },
          {
            label: "Vehicle Views",
            value: overview.vehicleDetailViews,
            color: "text-blue-300",
          },
          {
            label: "Total Sessions",
            value: overview.totalSessions,
            color: "text-white/70",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4"
          >
            <p className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light mb-2">
              {m.label}
            </p>
            <p className={`text-2xl font-light ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {dailyChart.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 mb-6">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Daily Traffic & Conversions
          </h3>

          <div className="h-[200px] flex items-end gap-[2px]">
            {dailyChart.map((d, i) => {
              const viewH = (d.views / maxDailyViews) * 100;
              const convH =
                d.conversions > 0
                  ? Math.max((d.conversions / maxDailyViews) * 100, 4)
                  : 0;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-0 group relative h-full"
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded px-2 py-1 text-[9px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {d.date.slice(5)}: {d.views} views, {d.visitors} visitors,{" "}
                    {d.conversions} conv
                  </div>

                  {convH > 0 && (
                    <div
                      style={{
                        height: `${convH}%`,
                        backgroundColor: barColorGreen,
                      }}
                      className="w-full rounded-t-sm opacity-80"
                    />
                  )}

                  <div
                    style={{ height: `${viewH}%`, backgroundColor: barColor }}
                    className="w-full rounded-t-sm opacity-60"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-white/25">
              {dailyChart[0]?.date?.slice(5)}
            </span>
            <div className="flex gap-4">
              <span className="text-[9px] text-white/25 flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: barColor, opacity: 0.6 }}
                />
                Views
              </span>
              <span className="text-[9px] text-white/25 flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ backgroundColor: barColorGreen, opacity: 0.8 }}
                />
                Conversions
              </span>
            </div>
            <span className="text-[9px] text-white/25">
              {dailyChart[dailyChart.length - 1]?.date?.slice(5)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {hourlyBreakdown.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
              Traffic by Hour
            </h3>

            <div className="h-[120px] flex items-end gap-[2px]">
              {hourlyBreakdown.map((h) => (
                <div
                  key={h.hour}
                  className="flex-1 group relative flex flex-col items-center justify-end h-full"
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded px-2 py-1 text-[9px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {String(h.hour).padStart(2, "0")}:00 — {h.views} views
                  </div>

                  <div
                    style={{
                      height: `${maxHourlyViews > 0 ? (h.views / maxHourlyViews) * 100 : 0}%`,
                      backgroundColor: barColorAlt,
                    }}
                    className="w-full rounded-t-sm opacity-50 min-h-[1px]"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-white/25">00:00</span>
              <span className="text-[9px] text-white/25">12:00</span>
              <span className="text-[9px] text-white/25">23:00</span>
            </div>
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Device Breakdown
          </h3>

          {totalDevices > 0 ? (
            <div className="space-y-3">
              {[
                {
                  label: "Desktop",
                  value: deviceBreakdown.desktop,
                  icon: "🖥",
                },
                { label: "Tablet", value: deviceBreakdown.tablet, icon: "📱" },
                { label: "Mobile", value: deviceBreakdown.mobile, icon: "📲" },
              ].map((d) => {
                const pct =
                  totalDevices > 0
                    ? Math.round((d.value / totalDevices) * 100)
                    : 0;

                return (
                  <div key={d.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/60 flex items-center gap-2">
                        <span>{d.icon}</span> {d.label}
                      </span>
                      <span className="text-white/40">
                        {d.value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                        className="h-full rounded-full opacity-60 transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-sm">No data yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Top Pages
          </h3>
          {sortedPages.length > 0 ? (
            <div className="space-y-2">
              {sortedPages.slice(0, 10).map(([page, count]) => {
                const pct =
                  overview.totalPageViews > 0
                    ? Math.round((count / overview.totalPageViews) * 100)
                    : 0;
                return (
                  <div key={page}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-white/60 truncate mr-2">
                        {getPageLabel(page)}
                      </span>
                      <span className="text-white/30 shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                        className="h-full rounded-full opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-xs">No data</p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Traffic Sources
          </h3>
          {sortedReferrers.length > 0 ? (
            <div className="space-y-2">
              {sortedReferrers.slice(0, 10).map(([ref, count]) => {
                const total = sortedReferrers.reduce((s, [, c]) => s + c, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={ref}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-white/60 truncate mr-2">{ref}</span>
                      <span className="text-white/30 shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: barColorAlt,
                        }}
                        className="h-full rounded-full opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-xs">No data</p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Popular Vehicles
          </h3>
          {sortedVehicles.length > 0 ? (
            <div className="space-y-2">
              {sortedVehicles.slice(0, 10).map(([vid, count]) => {
                const maxV = sortedVehicles[0]?.[1] || 1;
                const pct = Math.round((count / maxV) * 100);
                return (
                  <div key={vid}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-white/60">Vehicle #{vid}</span>
                      <span className="text-white/30">{count} views</span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: barColorGreen,
                        }}
                        className="h-full rounded-full opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-xs">No data</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Browsers
          </h3>
          {sortedBrowsers.length > 0 ? (
            <div className="space-y-2">
              {sortedBrowsers.map(([browser, count]) => {
                const total = sortedBrowsers.reduce((s, [, c]) => s + c, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={browser} className="flex justify-between text-xs">
                    <span className="text-white/60">{browser}</span>
                    <span className="text-white/30">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-xs">No data</p>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
            Languages
          </h3>
          {sortedLangs.length > 0 ? (
            <div className="space-y-2">
              {sortedLangs.map(([lang, count]) => {
                const total = sortedLangs.reduce((s, [, c]) => s + c, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={lang} className="flex justify-between text-xs">
                    <span className="text-white/60">{lang}</span>
                    <span className="text-white/30">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/25 text-xs">No data</p>
          )}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-light mb-4">
          Conversion Funnel
        </h3>

        <div className="flex items-end justify-center gap-6 h-[160px]">
          {[
            {
              label: "Visitors",
              value: overview.uniqueVisitors,
              color: barColorAlt,
            },
            {
              label: "Vehicle Views",
              value: overview.vehicleDetailViews,
              color: barColor,
            },
            {
              label: "Form Submissions",
              value: overview.formSubmissions,
              color: barColorGreen,
            },
          ].map((step, i) => {
            const maxVal = Math.max(overview.uniqueVisitors, 1);
            const h = Math.max((step.value / maxVal) * 100, 4);
            const prevVal =
              i === 0
                ? step.value
                : [
                    overview.uniqueVisitors,
                    overview.vehicleDetailViews,
                    overview.formSubmissions,
                  ][i - 1];
            const dropoff =
              prevVal > 0
                ? Math.round(((prevVal - step.value) / prevVal) * 100)
                : 0;

            return (
              <div
                key={step.label}
                className="flex flex-col items-center gap-2 flex-1 max-w-[200px]"
              >
                <span className="text-white/80 text-lg font-light">
                  {step.value}
                </span>
                {i > 0 && (
                  <span className="text-red-400/60 text-[9px]">
                    -{dropoff}%
                  </span>
                )}
                <div
                  style={{ height: `${h}%`, backgroundColor: step.color }}
                  className="w-full max-w-[80px] rounded-t-md opacity-60"
                />
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/35">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[8px] uppercase tracking-[0.3em] text-white/35 font-light block mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/[0.08] rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[hsl(43,67%,55%)]/30"
        placeholder={placeholder}
      />
    </div>
  );
}
