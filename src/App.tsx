import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

import NotFound from "./pages/NotFound";
import FormAtelier from "./pages/FormAtelier";
import FormChariot from "./pages/FormChariot";
import Stock from "./pages/Stock";
import BilanBke from "./pages/BilanBke";
import DashboardBke from "./pages/DashboardBke";
import FormMaintenance from "./pages/FormMaintenance";
import FormPalette from "./pages/FormPalette";
import StockSphere from "./pages/StockSphere";
import StockSphereHistory from "./pages/StockSphereHistory";
import Reception from "./pages/Reception";
import ReceptionHistory from "./pages/ReceptionHistory";
import RapportBL from "./pages/RapportBL";
import InspectionDashboard from "./pages/InspectionDashboard";
import InspectionConfiguration from "./pages/InspectionConfiguration";
import InspectionRonde from "./pages/InspectionRonde";
import InspectionValidation from "./pages/InspectionValidation";
import InspectionHistorique from "./pages/InspectionHistorique";
import { ProtectedRoute, VracProtectedRoute } from "./components/ProtectedRoute";
import { BonsExpiryWatcher } from "./components/rapport-bl/BonsExpiryWatcher";
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
      <BonsExpiryWatcher />
      <BrowserRouter>
        <Routes>
          {/* ===== Routes publiques ===== */}
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppHome />} />
          <Route path="/vrac-login" element={<VracLogin />} />

          {/* ===== Routes admin (Supabase Auth | app_auth_session | dashboard_authenticated) ===== */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardHistorique />} />
            <Route path="/sphere-calculation" element={<SphereCalculation />} />
            <Route path="/sphere-history" element={<SphereHistory />} />
            <Route path="/production-entry" element={<ProductionDataEntry />} />
            <Route path="/atelier-form" element={<FormAtelier />} />
            <Route path="/agents-equipements" element={<AgentsManagement />} />
            {/* Backward-compat : ancien lien /agents redirige vers /agents-equipements */}
            <Route path="/agents" element={<Navigate to="/agents-equipements" replace />} />
            <Route path="/import_data" element={<ImportData />} />
            <Route path="/new-bilan" element={<NewBilan />} />
            <Route path="/bilan-bke" element={<BilanBke />} />
            <Route path="/bouake" element={<DashboardBke />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/form-chariot" element={<FormChariot />} />
            <Route path="/stock-sphere" element={<StockSphere />} />
            <Route path="/stock-sphere-history" element={<StockSphereHistory />} />
            <Route path="/reception" element={<Reception />} />
            <Route path="/reception-history" element={<ReceptionHistory />} />
            <Route path="/rapport-bl" element={<RapportBL />} />
            <Route path="/vrac-admin" element={<VracAdminPanel />} />
            <Route path="/form-maintenance" element={<FormMaintenance />} />
            <Route path="/form-palette" element={<FormPalette />} />
            {/* Inspection module */}
            <Route path="/inspection" element={<InspectionDashboard />} />
            <Route path="/inspection/config" element={<InspectionConfiguration />} />
            <Route path="/inspection/ronde/:id" element={<InspectionRonde />} />
            <Route path="/inspection/ronde/:id/validation" element={<InspectionValidation />} />
            <Route path="/inspection/history" element={<InspectionHistorique />} />
          </Route>

          {/* ===== Routes VRAC client (vrac_session) ===== */}
          <Route element={<VracProtectedRoute />}>
            <Route path="/vrac" element={<VracClientPortal />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
