import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewBilan from "./pages/NewBilan";
import DashboardHistorique from "./pages/DashboardHistorique";
import SphereCalculation from "./pages/SphereCalculation";
import SphereHistory from "./pages/SphereHistory";
import ProductionDataEntry from "./pages/ProductionDataEntry";
import ChefsLigneManagement from "./pages/ChefsLigneManagement";
import Mandataires from "./pages/Mandataires";
import NotFound from "./pages/NotFound";
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
          <Route path="/" element={<Home />} />
          <Route path="/new-bilan" element={<NewBilan />} />
          <Route path="/dashboard" element={<DashboardHistorique />} />
          <Route path="/sphere-calculation" element={<SphereCalculation />} />
          <Route path="/sphere-history" element={<SphereHistory />} />
          <Route path="/production-entry" element={<ProductionDataEntry />} />
          <Route path="/chefs-ligne" element={<ChefsLigneManagement />} />
          <Route path="/mandataires" element={<Mandataires />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
