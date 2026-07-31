import { useState } from "react";
import { adminLogin } from "@/lib/api";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLogin(password, otp);

      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(
        err?.message || "Login failed (check API connection)"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img
            src="/images/logo-transparent.png"
            alt="TRANSYACHTGROUP"
            className="h-12 w-auto mx-auto mb-6 opacity-70"
          />
          <h1 className="font-serif text-2xl text-white mb-2 tracking-tight">
            Admin Panel
          </h1>
          <p className="text-white/30 text-sm font-light">
            Enter your password to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-light">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-black/40 border border-white/[0.08] rounded-md px-4 text-white text-sm focus:outline-none focus:border-[hsl(43,67%,55%)]/30 transition-colors"
              placeholder="Enter admin password"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-light">
              Authenticator code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full h-12 bg-black/40 border border-white/[0.08] rounded-md px-4 text-white text-sm tracking-[0.4em] focus:outline-none focus:border-[hsl(43,67%,55%)]/30 transition-colors"
              placeholder="Optional until MFA is configured"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[hsl(43,67%,55%)] text-black rounded-md text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-[hsl(43,67%,60%)] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setLocation("/")}
            className="font-porter text-white/20 hover:text-white/40 text-[10px] uppercase tracking-[0.3em] font-light transition-colors"
          >
            ← Back to Website
          </button>
        </div>
      </div>
    </div>
  );
}
