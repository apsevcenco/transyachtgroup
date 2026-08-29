import { useEffect, useRef } from "react";
import {
  GOOGLE_ADS_FORM_LABEL,
  hasAnalyticsConsent,
  trackGoogleAdsConversion,
  trackGoogleEvent,
} from "@/lib/googleAnalytics";
import { vehiclePath } from "@/lib/vehicleSeo";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const GUIDE_ATTRIBUTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionId(): string {
  let sid = sessionStorage.getItem("_tyg_sid");
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("_tyg_sid", sid);
  }
  return sid;
}

function track(eventType: string, extra: Record<string, unknown> = {}) {
  if (!hasAnalyticsConsent()) return;
  const payload = {
    sessionId: getSessionId(),
    eventType,
    page: window.location.pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    ...extra,
  };

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${API_BASE}/analytics/track`,
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
  } else {
    fetch(`${API_BASE}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}

function setGuideAttribution(slug: string) {
  sessionStorage.setItem("_tyg_guide_attribution", slug);
  sessionStorage.setItem("_tyg_guide_attribution_at", String(Date.now()));
}

function getGuideAttribution(): string | null {
  const guide = sessionStorage.getItem("_tyg_guide_attribution");
  const savedAt = Number(sessionStorage.getItem("_tyg_guide_attribution_at") || 0);
  if (!guide || !savedAt || Date.now() - savedAt > GUIDE_ATTRIBUTION_TTL_MS) {
    sessionStorage.removeItem("_tyg_guide_attribution");
    sessionStorage.removeItem("_tyg_guide_attribution_at");
    return null;
  }
  return guide;
}

export function trackSiteEvent(eventType: string, extra: Record<string, unknown> = {}) {
  track(eventType, extra);
}

export function usePageView() {
  const startTime = useRef(Date.now());
  const pathname = window.location.pathname;

  useEffect(() => {
    const guideMatch = pathname.match(/^\/guides\/([^/?]+)/);
    if (guideMatch) setGuideAttribution(guideMatch[1]);
    startTime.current = Date.now();
    track("page_view");

    return () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      track("page_leave", { duration });
    };
  }, [pathname]);
}

export function trackVehicleView(vehicle: { id: number | string; name: string; category: string }) {
  const vehicleId = String(vehicle.id);
  const vehicleName = vehicle.name.replace(/<[^>]*>/g, "").trim();
  const vehicleCategory = vehicle.category === "yacht" ? "yacht" : "car";
  const path = vehiclePath(vehicle);
  track("vehicle_view", {
    vehicleId,
    metadata: { vehicleName, vehicleCategory, vehiclePath: path },
  });
  trackGoogleEvent("view_item", {
    items: [{ item_id: vehicleId, item_name: vehicleName, item_category: vehicleCategory }],
    content_type: "vehicle",
    item_id: vehicleId,
    item_name: vehicleName,
  });
}

export function trackFormSubmit(formName?: string) {
  const form = formName || "contact";
  const guide = getGuideAttribution();
  const eventParameters = { form_name: form, content_guide: guide || undefined };
  track("form_submit", { metadata: { form, attributionGuide: guide } });
  trackGoogleEvent("generate_lead", eventParameters);
  trackGoogleEvent("ads_conversion_SUBMIT_LEAD_FORM_1", eventParameters);
  trackGoogleAdsConversion(GOOGLE_ADS_FORM_LABEL, {
    value: 1,
    currency: "EUR",
    ...eventParameters,
  });
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  const guide = getGuideAttribution();
  track(eventType, { metadata: { ...(metadata || {}), attributionGuide: guide || undefined } });
  trackGoogleEvent(eventType, metadata);
}
