import { navigate, usePathname } from "wouter/use-browser-location";

import { langFromPathname, stripLangPrefix, withLangPrefix } from "@/lib/langRoutes";

type NavigateOptions = Parameters<typeof navigate>[1];

/**
 * wouter location hook for language-prefixed URLs. Routes are declared without the prefix
 * (`/cars`), so the prefix is stripped from the location that routes match against, and added
 * back to every navigation (`setLocation("/cars")` on a French page goes to `/fr/cars`).
 * Use englishPath() from langRoutes to force the English URL.
 */
export function useLangLocation(): [string, (to: string, options?: NavigateOptions) => void] {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  return [stripLangPrefix(pathname), (to, options) => navigate(withLangPrefix(to, lang), options)];
}
