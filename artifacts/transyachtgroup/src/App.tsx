import {
  Component,
  lazy,
  Suspense,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FloatingContact } from "@/components/FloatingContact";
import { CookieBanner } from "@/components/CookieBanner";
import { RouteSeo } from "@/components/RouteSeo";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { vehicleIdFromSlug } from "@/lib/vehicleSeo";

const Home = lazy(() => import("@/pages/home"));
const Catalog = lazy(() => import("@/pages/catalog"));
const VehicleDetail = lazy(() => import("@/pages/vehicle-detail"));
const About = lazy(() => import("@/pages/about"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const LegalNotice = lazy(() => import("@/pages/legal-notice"));
const LocationPage = lazy(() => import("@/pages/location"));
const ServiceLanding = lazy(() => import("@/pages/service-landing"));
const GuidesPage = lazy(() => import("@/pages/guides"));
const GuideDetail = lazy(() => import("@/pages/guide-detail"));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminCarBookings = lazy(() => import("@/pages/admin/car-bookings"));
const AdminYachtBookings = lazy(() => import("@/pages/admin/yacht-bookings"));
const AdminCrm = lazy(() => import("@/pages/admin/crm"));
const AdminAgents = lazy(() => import("@/pages/admin/agents"));
const AdminProposals = lazy(() => import("@/pages/admin/proposals"));
const AdminContracts = lazy(() => import("@/pages/admin/contracts"));
const AdminGuides = lazy(() => import("@/pages/admin/guides"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="min-h-screen bg-[hsl(0,0%,3%)] text-white flex items-center justify-center px-6"
      >
        <div className="max-w-md text-center">
          <p className="text-gold text-xs uppercase tracking-[0.25em] mb-4">
            Trans Yacht Group
          </p>
          <h1 className="font-serif text-3xl mb-4">Something went wrong</h1>
          <p className="text-white/50 text-sm mb-7">
            The page could not be displayed. Reload it to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-gold px-5 py-3 text-xs uppercase tracking-[0.15em] text-black"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

function FloatingContactWrapper() {
  const [location] = useLocation();

  if (location.startsWith("/admin")) {
    return null;
  }

  return <FloatingContact />;
}

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center"
    >
      <div className="flex items-center gap-3 text-white/40">
        <span className="h-5 w-5 rounded-full border border-gold/30 border-t-gold animate-spin" />
        <span className="text-[10px] uppercase tracking-[0.2em]">Loading</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[200] -translate-y-20 rounded bg-gold px-4 py-2 text-xs font-medium text-black focus:translate-y-0"
      >
        Skip to content
      </a>
      <div id="main-content">
        <Suspense fallback={<PageFallback />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/yachts/:slug">
              {(params) => <VehicleDetail id={vehicleIdFromSlug(params.slug) || ""} />}
            </Route>
            <Route path="/cars/:slug">
              {(params) => <VehicleDetail id={vehicleIdFromSlug(params.slug) || ""} />}
            </Route>
            <Route path="/yachts">{() => <Catalog category="yacht" />}</Route>
            <Route path="/cars">{() => <Catalog category="car" />}</Route>
            <Route path="/vehicle/:id">
              {(params) => <VehicleDetail id={params.id} />}
            </Route>
            <Route path="/about" component={About} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/legal" component={LegalNotice} />
            <Route path="/locations/:city">
              {(params) => <LocationPage city={params.city} />}
            </Route>
            <Route path="/services/:slug">
              {(params) => <ServiceLanding slug={params.slug} />}
            </Route>
            <Route path="/guides" component={GuidesPage} />
            <Route path="/guides/:slug">
              {(params) => <GuideDetail slug={params.slug} />}
            </Route>
            <Route path="/admin" component={AdminLogin} />
            <Route
              path="/admin/dashboard/:section?"
              component={AdminDashboard}
            />
            <Route path="/admin/bookings/cars" component={AdminCarBookings} />
            <Route
              path="/admin/bookings/yachts"
              component={AdminYachtBookings}
            />
            <Route path="/admin/crm" component={AdminCrm} />
            <Route path="/admin/agents" component={AdminAgents} />
            <Route path="/admin/proposals" component={AdminProposals} />
            <Route path="/admin/contracts" component={AdminContracts} />
            <Route path="/admin/guides" component={AdminGuides} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>

      <FloatingContactWrapper />
      <CookieBanner />
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "hsl(0, 0%, 3%)";
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <RouteSeo />
              <GoogleAnalytics />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
