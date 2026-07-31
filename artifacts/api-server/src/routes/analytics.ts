import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analyticsEventsTable, contactRequestsTable } from "@workspace/db/schema";
import { desc, sql, eq, gte, lte, and, count } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const allowedEvents = new Set(["page_view", "form_submit", "vehicle_view", "click", "session_end"]);
const short = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= max ? value : null;

router.post("/analytics/track", analyticsLimiter, async (req, res) => {
  try {
    const { sessionId, eventType, page, referrer, userAgent, language, screenWidth, screenHeight, vehicleId, duration, metadata } = req.body;

    const validSession = short(sessionId, 64);
    const validEvent = short(eventType, 30);
    const validPage = short(page, 500);
    const validMetadata =
      metadata && typeof metadata === "object" && !Array.isArray(metadata) &&
      JSON.stringify(metadata).length <= 4000 ? metadata : {};
    if (!validSession || !validEvent || !allowedEvents.has(validEvent) || !validPage) {
      res.status(400).json({ error: "sessionId, eventType, and page are required" });
      return;
    }

    await db.insert(analyticsEventsTable).values({
      sessionId: validSession,
      eventType: validEvent,
      page: validPage,
      referrer: short(referrer, 1000),
      userAgent: short(userAgent, 500),
      language: short(language, 10),
      screenWidth: screenWidth ? String(screenWidth) : null,
      screenHeight: screenHeight ? String(screenHeight) : null,
      vehicleId: vehicleId ? String(vehicleId) : null,
      duration: duration ? String(duration) : null,
      metadata: validMetadata,
    });

    res.json({ success: true });
  } catch (err) {
    req.log?.warn?.({ err }, "Analytics track failed (ignored)");
    res.status(204).end();
  }
});

router.get("/analytics/stats", adminAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const conditions = [];

    if (from) conditions.push(gte(analyticsEventsTable.createdAt, new Date(from as string)));
    if (to) conditions.push(lte(analyticsEventsTable.createdAt, new Date(to as string)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allEvents = await db
      .select()
      .from(analyticsEventsTable)
      .where(whereClause)
      .orderBy(desc(analyticsEventsTable.createdAt));

    const totalRequests = await db
      .select({ count: count() })
      .from(contactRequestsTable)
      .where(conditions.length > 0 ? and(
        from ? gte(contactRequestsTable.createdAt, new Date(from as string)) : undefined,
        to ? lte(contactRequestsTable.createdAt, new Date(to as string)) : undefined,
      ) : undefined);

    const pageViews = allEvents.filter(e => e.eventType === "page_view");
    const uniqueSessions = new Set(allEvents.map(e => e.sessionId));
    const formSubmissions = allEvents.filter(e => e.eventType === "form_submit");
    const vehicleViews = allEvents.filter(e => e.eventType === "vehicle_view");

    const sessionPages: Record<string, Set<string>> = {};
    for (const e of pageViews) {
      if (!sessionPages[e.sessionId]) sessionPages[e.sessionId] = new Set();
      sessionPages[e.sessionId].add(e.page);
    }
    const bounceSessions = Object.values(sessionPages).filter(pages => pages.size === 1).length;
    const bounceRate = uniqueSessions.size > 0 ? Math.round((bounceSessions / uniqueSessions.size) * 100) : 0;

    const durations = allEvents
      .filter(e => e.eventType === "page_leave" && e.duration)
      .map(e => parseInt(e.duration!, 10))
      .filter(d => !isNaN(d) && d > 0 && d < 3600);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const pageBreakdown: Record<string, number> = {};
    for (const e of pageViews) {
      const p = e.page.replace(/\?.*$/, "").replace(/\/$/, "") || "/";
      pageBreakdown[p] = (pageBreakdown[p] || 0) + 1;
    }

    const referrerBreakdown: Record<string, number> = {};
    for (const e of pageViews) {
      if (e.referrer) {
        try {
          const host = new URL(e.referrer).hostname || "direct";
          referrerBreakdown[host] = (referrerBreakdown[host] || 0) + 1;
        } catch {
          referrerBreakdown["direct"] = (referrerBreakdown["direct"] || 0) + 1;
        }
      } else {
        referrerBreakdown["direct"] = (referrerBreakdown["direct"] || 0) + 1;
      }
    }

    const deviceBreakdown: Record<string, number> = { desktop: 0, tablet: 0, mobile: 0 };
    for (const e of allEvents) {
      if (!e.sessionId || deviceBreakdown[e.sessionId] !== undefined) continue;
      const w = parseInt(e.screenWidth || "1920", 10);
      if (w <= 768) deviceBreakdown.mobile++;
      else if (w <= 1024) deviceBreakdown.tablet++;
      else deviceBreakdown.desktop++;
    }
    const sessionDevices: Record<string, string> = {};
    for (const e of allEvents) {
      if (sessionDevices[e.sessionId]) continue;
      const w = parseInt(e.screenWidth || "1920", 10);
      sessionDevices[e.sessionId] = w <= 768 ? "mobile" : w <= 1024 ? "tablet" : "desktop";
    }
    const deviceCounts = { desktop: 0, tablet: 0, mobile: 0 };
    for (const d of Object.values(sessionDevices)) {
      deviceCounts[d as keyof typeof deviceCounts]++;
    }

    const browserBreakdown: Record<string, number> = {};
    const sessionBrowsers: Record<string, boolean> = {};
    for (const e of allEvents) {
      if (sessionBrowsers[e.sessionId]) continue;
      sessionBrowsers[e.sessionId] = true;
      const ua = e.userAgent || "";
      let browser = "Other";
      if (ua.includes("Edg/")) browser = "Edge";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
      browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;
    }

    const langBreakdown: Record<string, number> = {};
    const sessionLangs: Record<string, boolean> = {};
    for (const e of allEvents) {
      if (sessionLangs[e.sessionId]) continue;
      sessionLangs[e.sessionId] = true;
      const lang = (e.language || "unknown").split("-")[0].toUpperCase();
      langBreakdown[lang] = (langBreakdown[lang] || 0) + 1;
    }

    const vehicleViewBreakdown: Record<string, number> = {};
    for (const e of vehicleViews) {
      if (e.vehicleId) {
        vehicleViewBreakdown[e.vehicleId] = (vehicleViewBreakdown[e.vehicleId] || 0) + 1;
      }
    }

    const dailyStats: Record<string, { views: number; visitors: Set<string>; conversions: number }> = {};
    for (const e of allEvents) {
      const day = new Date(e.createdAt!).toISOString().split("T")[0];
      if (!dailyStats[day]) dailyStats[day] = { views: 0, visitors: new Set(), conversions: 0 };
      if (e.eventType === "page_view") dailyStats[day].views++;
      dailyStats[day].visitors.add(e.sessionId);
      if (e.eventType === "form_submit") dailyStats[day].conversions++;
    }

    const dailyChart = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        views: data.views,
        visitors: data.visitors.size,
        conversions: data.conversions,
      }));

    const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => ({ hour: i, views: 0 }));
    for (const e of pageViews) {
      const h = new Date(e.createdAt!).getHours();
      hourlyBreakdown[h].views++;
    }

    const conversionRate = uniqueSessions.size > 0
      ? Math.round((formSubmissions.length / uniqueSessions.size) * 10000) / 100
      : 0;

    const pagesPerSession = uniqueSessions.size > 0
      ? Math.round((pageViews.length / uniqueSessions.size) * 100) / 100
      : 0;

    res.json({
      overview: {
        totalPageViews: pageViews.length,
        uniqueVisitors: uniqueSessions.size,
        totalSessions: uniqueSessions.size,
        bounceRate,
        avgSessionDuration: avgDuration,
        formSubmissions: formSubmissions.length,
        totalRequests: totalRequests[0]?.count || 0,
        conversionRate,
        pagesPerSession,
        vehicleDetailViews: vehicleViews.length,
      },
      dailyChart,
      hourlyBreakdown,
      pageBreakdown,
      referrerBreakdown,
      deviceBreakdown: deviceCounts,
      browserBreakdown,
      languageBreakdown: langBreakdown,
      vehicleViewBreakdown,
    });
  } catch (err) {
    console.error("Analytics stats error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
