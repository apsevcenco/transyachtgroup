import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
  boolean,
  jsonb,
  integer,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: varchar("category", { length: 10 }).notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  images: jsonb("images").default([]),
  featured: boolean("featured").default(false),
  visible: boolean("visible").default(true),
  specs: jsonb("specs").default({}),
  translations: jsonb("translations").default({}),
  ownership: varchar("ownership", { length: 10 }).notNull().default("own"),
  agentId: integer("agent_id").references(() => agentsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
});

export const vehicleDeletionLogTable = pgTable(
  "vehicle_deletion_log",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id"),
    vehicleName: text("vehicle_name").notNull(),
    vehicleCategory: varchar("vehicle_category", { length: 10 }).notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    actor: text("actor").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    snapshot: jsonb("snapshot").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("vehicle_deletion_log_vehicle_idx").on(table.vehicleId),
    index("vehicle_deletion_log_created_idx").on(table.createdAt),
  ],
);

export const siteContentTable = pgTable("site_content", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  translations: jsonb("translations").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const guidesTable = pgTable(
  "guides",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    coverImage: text("cover_image"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    translations: jsonb("translations").default({}),
    primaryKeyword: text("primary_keyword"),
    contentCluster: text("content_cluster"),
    targetPage: text("target_page"),
    scheduledAt: timestamp("scheduled_at"),
    seoScore: integer("seo_score"),
    seoAudit: jsonb("seo_audit").default({}),
    searchMetrics: jsonb("search_metrics").default({}),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("guides_published_at_idx").on(table.published, table.publishedAt),
    index("guides_schedule_idx").on(table.scheduledAt),
    index("guides_cluster_idx").on(table.contentCluster),
  ],
);

export const seoContentPlansTable = pgTable(
  "seo_content_plans",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    strategy: jsonb("strategy").notNull().default({}),
    items: jsonb("items").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("seo_content_plans_updated_idx").on(table.updatedAt)],
);

export const seoCompetitorsTable = pgTable("seo_competitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull().unique(),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seoCompetitorSnapshotsTable = pgTable("seo_competitor_snapshots", {
  id: serial("id").primaryKey(),
  competitorId: integer("competitor_id").notNull(),
  pageUrl: text("page_url").notNull(),
  title: text("title"),
  metaDescription: text("meta_description"),
  h1: text("h1"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  summary: jsonb("summary").notNull().default({}),
  changed: boolean("changed").notNull().default(false),
  scannedAt: timestamp("scanned_at").defaultNow(),
}, (table) => [index("seo_competitor_snapshots_lookup_idx").on(table.competitorId, table.scannedAt)]);

export const seoOpportunitiesTable = pgTable("seo_opportunities", {
  id: serial("id").primaryKey(),
  competitorId: integer("competitor_id"),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  keyword: text("keyword"),
  targetPage: text("target_page"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  context: jsonb("context").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("seo_opportunities_status_idx").on(table.status, table.createdAt)]);

export const adminSessionsTable = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const contactRequestsTable = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  interest: varchar("interest", { length: 50 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 30 }).notNull(),
  page: text("page").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  language: varchar("language", { length: 10 }),
  screenWidth: varchar("screen_width", { length: 10 }),
  screenHeight: varchar("screen_height", { length: 10 }),
  country: varchar("country", { length: 5 }),
  vehicleId: varchar("vehicle_id", { length: 20 }),
  duration: varchar("duration", { length: 20 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),
    status: varchar("status", { length: 20 }).notNull().default("confirmed"),
    clientName: text("client_name"),
    clientPhone: text("client_phone"),
    clientEmail: text("client_email"),
    notes: text("notes"),
    source: varchar("source", { length: 10 }).notNull().default("manual"),
    icalUrl: text("ical_url"),
    rentalPeriodType: varchar("rental_period_type", { length: 10 })
      .notNull()
      .default("daily"),
    totalAmount: integer("total_amount"),
    depositAmount: integer("deposit_amount"),
    vatPercent: integer("vat_percent"),
    agentCommissionPercent: integer("agent_commission_percent"),
    agentName: text("agent_name"),
    agentPhone: text("agent_phone"),
    agentEmail: text("agent_email"),
    contractStatus: varchar("contract_status", { length: 20 }).default(
      "not_signed",
    ),
    kmIncluded: integer("km_included"),
    pricePerExtraKm: integer("price_per_extra_km"),
    // Car handover/return tracking — "own" vehicles only
    odometerOut: integer("odometer_out"),
    odometerIn: integer("odometer_in"),
    depositStatus: varchar("deposit_status", { length: 20 }),
    driverCost: integer("driver_cost"),
    fuelCost: integer("fuel_cost"),
    tollCost: integer("toll_cost"),
    deliveryCost: integer("delivery_cost"),
    bookingPhotos: jsonb("booking_photos").default([]),
    // Yacht-only fields (null for category="car" bookings)
    departurePort: text("departure_port"),
    returnPort: text("return_port"),
    charterRate: integer("charter_rate"),
    charterRatePeriod: varchar("charter_rate_period", { length: 10 }),
    captainName: text("captain_name"),
    captainDayRate: integer("captain_day_rate"),
    stewardessCount: integer("stewardess_count"),
    stewardessDayRate: integer("stewardess_day_rate"),
    deckhandCount: integer("deckhand_count"),
    deckhandDayRate: integer("deckhand_day_rate"),
    apaAmount: integer("apa_amount"),
    depositPaid: boolean("deposit_paid").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("bookings_vehicle_dates_idx").on(
      table.vehicleId,
      table.startDate,
      table.endDate,
    ),
  ],
);

// One row per booking that has ever transitioned to status="completed" — a
// permanent snapshot (vehicle name/category/image copied at completion time)
// so history survives the source booking or vehicle being edited/deleted later.
export const rentalHistoryTable = pgTable(
  "rental_history",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id").references(() => bookingsTable.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at").defaultNow(),

    clientName: text("client_name"),
    clientPhone: text("client_phone"),
    clientNotes: text("client_notes"),

    vehicleId: integer("vehicle_id").references(() => vehiclesTable.id, {
      onDelete: "set null",
    }),
    vehicleName: text("vehicle_name").notNull(),
    vehicleCategory: varchar("vehicle_category", { length: 10 }).notNull(),
    vehicleImage: text("vehicle_image"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: integer("total_days").notNull(),

    rentalPeriodType: varchar("rental_period_type", { length: 10 })
      .notNull()
      .default("daily"),
    totalAmount: integer("total_amount"),
    depositAmount: integer("deposit_amount"),
    vatPercent: integer("vat_percent"),
    agentCommissionPercent: integer("agent_commission_percent"),
    agentName: text("agent_name"),
    agentPhone: text("agent_phone"),
    agentEmail: text("agent_email"),
    charterRate: integer("charter_rate"),
    charterRatePeriod: varchar("charter_rate_period", { length: 10 }),
    apaAmount: integer("apa_amount"),

    captainName: text("captain_name"),
    captainDayRate: integer("captain_day_rate"),
    stewardessCount: integer("stewardess_count"),
    stewardessDayRate: integer("stewardess_day_rate"),
    deckhandCount: integer("deckhand_count"),
    deckhandDayRate: integer("deckhand_day_rate"),

    kmIncluded: integer("km_included"),
    pricePerExtraKm: integer("price_per_extra_km"),
    odometerOut: integer("odometer_out"),
    odometerIn: integer("odometer_in"),
    depositStatus: varchar("deposit_status", { length: 20 }),
    driverCost: integer("driver_cost"),
    fuelCost: integer("fuel_cost"),
    tollCost: integer("toll_cost"),
    deliveryCost: integer("delivery_cost"),
    bookingPhotos: jsonb("booking_photos").default([]),
    departurePort: text("departure_port"),
    returnPort: text("return_port"),

    source: varchar("source", { length: 10 }),
    icalUrl: text("ical_url"),
    contractStatus: varchar("contract_status", { length: 20 }),
  },
  (table) => [
    index("rental_history_vehicle_idx").on(table.vehicleId),
    index("rental_history_dates_idx").on(table.startDate, table.endDate),
  ],
);

export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;

// One row per generated Rental Agreement PDF — an audit trail (who rented
// what, on what terms) and the source of truth for the sequential per-day
// contract numbering scheme (TYG-DDMMYY-XXX).
//
// Matches migrations/0011_contracts.sql exactly — a hand-run "basic SQL"
// table (no FK constraints, no indexes, dates stored as plain TEXT rather
// than DATE) rather than the drizzle-kit-style DDL used elsewhere in this
// file. Only renterName/contractNumber are NOT NULL at the DB level; every
// other "required" field (pickupDate, totalAmount, representativeName, etc.)
// is still enforced at the application layer in
// api-server/src/routes/contracts.ts before insert — the DB itself is
// intentionally permissive here.
export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNumber: varchar("contract_number", { length: 50 }).notNull().unique(),
  requestId: varchar("request_id", { length: 64 }).unique(),
  bookingId: integer("booking_id"),
  vehicleId: integer("vehicle_id"),

  renterName: text("renter_name").notNull(),
  renterDob: text("renter_dob"),
  renterPob: text("renter_pob"),
  renterNationality: text("renter_nationality"),
  renterPassport: text("renter_passport"),
  renterPassportExpiry: text("renter_passport_expiry"),
  renterLicence: text("renter_licence"),
  renterLicenceExpiry: text("renter_licence_expiry"),
  renterLicenceIssuedBy: text("renter_licence_issued_by"),
  renterPhone: text("renter_phone"),
  renterEmail: text("renter_email"),

  pickupDate: text("pickup_date"),
  returnDate: text("return_date"),
  pickupLocation: text("pickup_location"),
  returnLocation: text("return_location"),

  totalAmount: numeric("total_amount", {
    precision: 12,
    scale: 2,
    mode: "number",
  }),
  depositAmount: numeric("deposit_amount", {
    precision: 12,
    scale: 2,
    mode: "number",
  }),
  kmPerDay: integer("km_per_day"),
  extraKmPrice: numeric("extra_km_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }),

  representativeName: text("representative_name"),
  snapshot: jsonb("snapshot"),
  pdfSha256: varchar("pdf_sha256", { length: 64 }),
  pdfBase64: text("pdf_base64"),
  templateVersion: varchar("template_version", { length: 30 }),
  issuedAt: timestamp("issued_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

// No refine overrides here on purpose — every column is either .notNull()
// with no default (stays required) or nullable (stays optional/nullable).
// Passing a plain-schema refine (rather than a `(schema) => ...` function)
// short-circuits drizzle-zod's own optional/nullable inference — see the
// insertVehicleSchema.ownership fix — so this table avoids refine entirely.
export const insertContractSchema = createInsertSchema(contractsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;

export const insertVehicleSchema = createInsertSchema(vehiclesTable, {
  // .optional() only — the column is NOT NULL at the DB level (default
  // "own"), so it may be omitted but never explicitly nulled.
  ownership: z.enum(["own", "agent"]).optional(),
}).omit({ id: true, createdAt: true, deletedAt: true, deletedBy: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;

export const insertBookingSchema = createInsertSchema(bookingsTable, {
  status: z.enum([
    "confirmed",
    "tentative",
    "blocked",
    "maintenance",
    "completed",
  ]),
  source: z.enum(["manual", "ical"]),
  contractStatus: z.enum(["not_signed", "sent", "signed"]).nullish(),
  charterRatePeriod: z.enum(["fixed", "per_day", "per_week"]).nullish(),
  depositStatus: z.enum(["received", "returned", "partial"]).nullish(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

export const insertRentalHistorySchema = createInsertSchema(
  rentalHistoryTable,
  {
    charterRatePeriod: z.enum(["fixed", "per_day", "per_week"]).nullish(),
    contractStatus: z.enum(["not_signed", "sent", "signed"]).nullish(),
    source: z.enum(["manual", "ical"]).nullish(),
    depositStatus: z.enum(["received", "returned", "partial"]).nullish(),
  },
).omit({ id: true, completedAt: true });
export type InsertRentalHistory = z.infer<typeof insertRentalHistorySchema>;
export type RentalHistory = typeof rentalHistoryTable.$inferSelect;

export const insertSiteContentSchema = createInsertSchema(
  siteContentTable,
).omit({ id: true, updatedAt: true });
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;
export type SiteContent = typeof siteContentTable.$inferSelect;

export const insertGuideSchema = createInsertSchema(guidesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type Guide = typeof guidesTable.$inferSelect;
