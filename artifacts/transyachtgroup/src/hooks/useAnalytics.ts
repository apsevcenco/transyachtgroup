import { useEffect, useRef } from "react";
import { hasAnalyticsConsent, trackGoogleEvent } from "@/lib/googleAnalytics";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

export function usePageView() {
  const startTime = useRef(Date.now());
  const pathname = window.location.pathname;

  useEffect(() => {
    const guideMatch = pathname.match(/^\/guides\/([^/?]+)/);
    if (guideMatch) sessionStorage.setItem("_tyg_guide_attribution", guideMatch[1]);
    startTime.current = Date.now();
    track("page_view");

    return () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      track("page_leave", { duration });
    };
  }, [pathname]);
}

export function trackVehicleView(vehicleId: number | string) {
  track("vehicle_view", { vehicleId: String(vehicleId) });
  trackGoogleEvent("select_content", {
    content_type: "vehicle",
    item_id: String(vehicleId),
  });
}

export function trackFormSubmit(formName?: string) {
  const form = formName || "contact";
  const guide = sessionStorage.getItem("_tyg_guide_attribution");
  const eventParameters = { form_name: form, content_guide: guide || undefined };
  track("form_submit", { metadata: { form, attributionGuide: guide } });
  trackGoogleEvent("generate_lead", eventParameters);
  trackGoogleEvent("ads_conversion_SUBMIT_LEAD_FORM_1", eventParameters);
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>) {
  track(eventType, { metadata });
  trackGoogleEvent(eventType, metadata);
}
