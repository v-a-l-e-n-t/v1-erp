import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewBilan from "./pages/NewBilan";
import DashboardHistorique from "./pages/DashboardHistorique";
import SphereCalculation from "./pages/SphereCalculation";
import SphereHistory from "./pages/SphereHistory";
import ProductionDataEntry from "./pages/ProductionDataEntry";
import ChefsLigneManagement from "./pages/ChefsLigneManagement";
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
          <Route path="/" element={<NewBilan />} />
          <Route path="/dashboard" element={<DashboardHistorique />} />
          <Route path="/sphere-calculation" element={<SphereCalculation />} />
          <Route path="/sphere-history" element={<SphereHistory />} />
          <Route path="/production-entry" element={<ProductionDataEntry />} />
          <Route path="/chefs-ligne" element={<ChefsLigneManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
