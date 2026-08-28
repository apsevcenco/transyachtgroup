import { useEffect } from "react";
import { useLocation } from "wouter";

import {
  CONSENT_CHANGE_EVENT,
  GOOGLE_ADS_PHONE_LABEL,
  GOOGLE_ADS_WHATSAPP_LABEL,
  initializeGoogleAnalytics,
  trackGoogleAdsConversion,
  trackGoogleEvent,
} from "@/lib/googleAnalytics";

const CONTACT_CLICK_DEDUPLICATION_MS = 1_000;

function getContactPlacement(link: HTMLAnchorElement): string {
  return (
    link.dataset.analyticsPlacement ||
    link.getAttribute("aria-label") ||
    link.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
    "unknown"
  );
}

function getVehicleContext(): string | undefined {
  const match = window.location.pathname.match(/^\/(?:cars|yachts|vehicles)\/([^/?]+)/i);
  return match?.[1];
}

export function GoogleAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    initializeGoogleAnalytics();
    const handleConsent = () => {
      initializeGoogleAnalytics();
      trackGoogleEvent("page_view", {
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
      });
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsent);
  }, []);

  useEffect(() => {
    trackGoogleEvent("page_view", {
      page_location: window.location.href,
      page_path: location,
      page_title: document.title,
    });
  }, [location]);

  useEffect(() => {
    let lastContactClick = "";
    let lastContactClickAt = 0;

    const handleClick = (event: MouseEvent) => {
      const link = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a")
        : null;
      const href = link?.getAttribute("href") || "";
      const isPhone = href.toLowerCase().startsWith("tel:");
      const isWhatsapp = /(?:wa\.me\/|whatsapp\.com\/)/i.test(href);

      if (link && (isPhone || isWhatsapp)) {
        const method = isPhone ? "phone" : "whatsapp";
        const now = Date.now();
        const deduplicationKey = `${method}:${href}`;
        if (
          deduplicationKey === lastContactClick &&
          now - lastContactClickAt < CONTACT_CLICK_DEDUPLICATION_MS
        ) return;

        lastContactClick = deduplicationKey;
        lastContactClickAt = now;

        const parameters = {
          method,
          link_url: link.href || href,
          link_text: link.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) || undefined,
          contact_placement: getContactPlacement(link),
          page_location: window.location.href,
          page_path: window.location.pathname + window.location.search,
          page_title: document.title,
          vehicle_id: getVehicleContext(),
        };

        trackGoogleEvent(isPhone ? "phone_click" : "whatsapp_click", parameters);
        trackGoogleAdsConversion(
          isPhone ? GOOGLE_ADS_PHONE_LABEL : GOOGLE_ADS_WHATSAPP_LABEL,
          {
            value: 1,
            currency: "EUR",
            ...parameters,
          },
        );
      } else if (href.startsWith("mailto:")) {
        trackGoogleEvent("contact_click", {
          method: "email",
          link_url: link?.href || href,
          page_path: window.location.pathname + window.location.search,
        });
      } else if (link?.hasAttribute("download") || /\.pdf(?:$|\?)/i.test(href)) {
        trackGoogleEvent("file_download", {
          file_name: href.split("/").pop()?.split("?")[0] || "document",
          link_url: link?.href || href,
        });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
