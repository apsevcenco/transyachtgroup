import { useEffect, useState } from "react";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  denyGoogleAnalytics,
} from "@/lib/googleAnalytics";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "rejected");
    denyGoogleAnalytics();
    setVisible(false);
  };

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-2 left-2 z-[190] rounded border border-white/10 bg-black/75 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-white/45 backdrop-blur hover:text-white"
      >
        Cookie settings
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full z-[200] bg-black/90 backdrop-blur-md border-t border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
       <p className="text-white/60 text-sm font-light max-w-xl">
  With your permission, we use analytics cookies to understand site traffic and improve our services.
  You can accept or reject analytics cookies. See our{" "}
  <a
    href="/privacy"
    className="text-[hsl(43,67%,55%)] hover:underline"
  >
    Privacy Policy
  </a>.
</p>

        <div className="flex gap-2">
          <button
            onClick={reject}
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] border border-white/[0.1] text-white/50 hover:text-white transition"
          >
            Reject
          </button>

          <button
            onClick={accept}
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] bg-[hsl(43,67%,55%)] text-black font-medium hover:bg-[hsl(43,67%,65%)] transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
