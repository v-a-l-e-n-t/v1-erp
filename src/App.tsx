import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import AppHome from "./pages/AppHome";
import NewBilan from "./pages/NewBilan";
import DashboardHistorique from "./pages/DashboardHistorique";
import SphereCalculation from "./pages/SphereCalculation";
import SphereHistory from "./pages/SphereHistory";
import ProductionDataEntry from "./pages/ProductionDataEntry";
import AgentsManagement from "./pages/AgentsManagement";
import ImportData from "./pages/ImportData";
import VracClientPortal from "./pages/VracClientPortal";
import VracLogin from "./pages/VracLogin";
import VracAdminPanel from "./pages/VracAdminPanel";
import VracChargementDashboard from "./pages/VracChargementDashboard";
import NotFound from "./pages/NotFound";
import FormAtelier from "./pages/FormAtelier";
import { ProtectedRoute } from "./components/ProtectedRoute";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppHome />} />
          <Route path="/dashboard" element={<DashboardHistorique />} />
          <Route path="/sphere-calculation" element={<SphereCalculation />} />
          <Route path="/sphere-history" element={<SphereHistory />} />
          <Route path="/production-entry" element={<ProductionDataEntry />} />
          <Route path="/atelier-form" element={<FormAtelier />} />
          <Route path="/agents" element={<AgentsManagement />} />
          <Route path="/import_data" element={<ImportData />} />
          <Route path="/new-bilan" element={<NewBilan />} />
          {/* VRAC Module Routes - Public Access */}
          <Route path="/vrac-login" element={<VracLogin />} />
          <Route path="/vrac" element={<VracClientPortal />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/vrac-admin" element={<VracAdminPanel />} />
            <Route path="/vrac-chargements" element={<VracChargementDashboard />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
