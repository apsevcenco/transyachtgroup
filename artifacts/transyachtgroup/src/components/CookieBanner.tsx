import { useEffect, useState } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[200] bg-black/90 backdrop-blur-md border-t border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
       <p className="text-white/60 text-sm font-light max-w-xl">
  We use cookies to enhance your experience, analyze traffic, and provide personalized services. 
  By using this site, you agree to our{" "}
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
