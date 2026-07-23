import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FloatingContact } from "@/components/FloatingContact";
import { CookieBanner } from "@/components/CookieBanner";

const Home = lazy(() => import("@/pages/home"));
const Catalog = lazy(() => import("@/pages/catalog"));
const VehicleDetail = lazy(() => import("@/pages/vehicle-detail"));
const About = lazy(() => import("@/pages/about"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const LegalNotice = lazy(() => import("@/pages/legal-notice"));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminCarBookings = lazy(() => import("@/pages/admin/car-bookings"));
const AdminYachtBookings = lazy(() => import("@/pages/admin/yacht-bookings"));
const AdminCrm = lazy(() => import("@/pages/admin/crm"));
const AdminAgents = lazy(() => import("@/pages/admin/agents"));
const AdminProposals = lazy(() => import("@/pages/admin/proposals"));
const AdminContracts = lazy(() => import("@/pages/admin/contracts"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function FloatingContactWrapper() {
  const [location] = useLocation();

  if (location.startsWith("/admin")) {
    return null;
  }

  return <FloatingContact />;
}

function PageFallback() {
  return null;
}

function Router() {
  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/yachts">
            {() => <Catalog category="yacht" />}
          </Route>
          <Route path="/cars">
            {() => <Catalog category="car" />}
          </Route>
          <Route path="/vehicle/:id">
            {(params) => <VehicleDetail id={params.id} />}
          </Route>
          <Route path="/about" component={About} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/legal" component={LegalNotice} />
          <Route path="/admin" component={AdminLogin} />
          <Route path="/admin/dashboard/:section?" component={AdminDashboard} />
          <Route path="/admin/bookings/cars" component={AdminCarBookings} />
          <Route path="/admin/bookings/yachts" component={AdminYachtBookings} />
          <Route path="/admin/crm" component={AdminCrm} />
          <Route path="/admin/agents" component={AdminAgents} />
          <Route path="/admin/proposals" component={AdminProposals} />
          <Route path="/admin/contracts" component={AdminContracts} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>

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
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
