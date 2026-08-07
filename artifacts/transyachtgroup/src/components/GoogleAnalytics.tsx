import { useEffect } from "react";
import { useLocation } from "wouter";

import {
  CONSENT_CHANGE_EVENT,
  initializeGoogleAnalytics,
  trackGoogleEvent,
} from "@/lib/googleAnalytics";

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
    const handleClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      const href = link?.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        trackGoogleEvent("contact_click", { method: "phone" });
      } else if (href.includes("wa.me/") || href.includes("whatsapp.com/")) {
        trackGoogleEvent("contact_click", { method: "whatsapp" });
      } else if (href.startsWith("mailto:")) {
        trackGoogleEvent("contact_click", { method: "email" });
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
