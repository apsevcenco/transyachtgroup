export const GA_MEASUREMENT_ID = "G-QY13F9EB8G";
export const CONSENT_STORAGE_KEY = "cookie_consent";
export const CONSENT_CHANGE_EVENT = "tyg:consent-change";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

export function hasAnalyticsConsent(): boolean {
  return localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || (function gtag() {
    window.dataLayer.push(arguments);
  } as (...args: unknown[]) => void);
}

export function initializeGoogleAnalytics(): void {
  if (!hasAnalyticsConsent()) return;
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (!loaded && !document.querySelector(`script[data-ga4="${GA_MEASUREMENT_ID}"]`)) {
    loaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.ga4 = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.gtag?.("js", new Date());
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
    });
  }
}

export function denyGoogleAnalytics(): void {
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function trackGoogleEvent(
  eventName: string,
  parameters: Record<string, unknown> = {},
): void {
  if (!hasAnalyticsConsent()) return;
  initializeGoogleAnalytics();
  window.gtag?.("event", eventName, parameters);
}
