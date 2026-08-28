export const GA_MEASUREMENT_ID = "G-QY13F9EB8G";
export const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || "";
export const GOOGLE_ADS_FORM_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_FORM_CONVERSION_LABEL || "";
export const GOOGLE_ADS_PHONE_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_PHONE_CONVERSION_LABEL || "";
export const GOOGLE_ADS_WHATSAPP_LABEL =
  import.meta.env.VITE_GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL || "";
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
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
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
    if (GOOGLE_ADS_ID) {
      window.gtag?.("config", GOOGLE_ADS_ID, {
        send_page_view: false,
      });
    }
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

export function trackGoogleAdsConversion(
  label: string,
  parameters: Record<string, unknown> = {},
): void {
  if (!GOOGLE_ADS_ID || !label || !hasAnalyticsConsent()) return;
  initializeGoogleAnalytics();
  window.gtag?.("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    ...parameters,
  });
}
