import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { checkAuth } from "@/lib/api";
import { ProposalsDashboard } from "@/components/admin/ProposalsDashboard";

export default function ProposalsPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) {
        setLocation("/admin");
        return;
      }
      setLoading(false);
    });
  }, [setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] text-white">
      <header className="border-b border-white/[0.06] bg-black/50 sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setLocation("/admin/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft size={18} />
            <span className="text-xs uppercase tracking-[0.15em]">Back to Admin</span>
          </button>
        </div>
      </header>

      <div className="px-4 py-6">
        <h1 className="font-porter text-white text-lg mb-5">Proposal Generator</h1>
        <p className="mb-5 max-w-2xl text-sm leading-6 text-white/45">
          Use Single Vehicle for car PDFs, Fleet Offer for multi-car offers, or
          AI Business Letter for one-page luxury letters to hotels, concierges
          and partners.
        </p>
        <ProposalsDashboard />
      </div>
    </div>
  );
}
