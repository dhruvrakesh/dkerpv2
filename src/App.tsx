import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DKEGLAuthProvider } from "@/hooks/useDKEGLAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InventoryLayout } from "@/components/layout/InventoryLayout";
import Index from "./pages/Index";
import DKEGLAuth from "./pages/DKEGLAuth";
import NotFound from "./pages/NotFound";
import InventoryDashboard from "./pages/inventory/InventoryDashboard";
import { ItemMaster } from "./pages/inventory/ItemMaster";
import GRNManagement from "./pages/inventory/GRNManagement";
import IssueManagement from "./pages/inventory/IssueManagement";
import StockManagement from "./pages/inventory/StockManagement";
import PricingMasterPage from "./pages/inventory/PricingMasterPage";
import { ProductionAnalyticsDashboard } from "./components/analytics/ProductionAnalyticsDashboard";
import { VendorManagement } from "./components/procurement/VendorManagement";
import { QualityControlDashboard } from "./components/quality/QualityControlDashboard";
import { GravurePrinting } from "./components/manufacturing/GravurePrinting";
import { LaminationCoating } from "./components/manufacturing/LaminationCoating";
import { AdhesiveCoating } from "./components/manufacturing/AdhesiveCoating";
import { SlittingPackaging } from "./components/manufacturing/SlittingPackaging";
import { ManufacturingWorkflow } from "./components/manufacturing/ManufacturingWorkflow";
import { WorkflowDashboard } from "./components/manufacturing/WorkflowDashboard";
import { OrderPunching } from "./components/manufacturing/OrderPunching";
import { CostAnalysisDashboard } from "./components/manufacturing/CostAnalysisDashboard";
import { UiornTrackingDashboard } from "./components/manufacturing/UiornTrackingDashboard";
import { BOMManagement } from "./pages/manufacturing/BOMManagement";
import AIAssistant from "./pages/ai/AIAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DKEGLAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<DKEGLAuth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <InventoryDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory/items" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ItemMaster />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory/grn" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <GRNManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory/issues" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <IssueManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory/stock" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <StockManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory/pricing" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <PricingMasterPage />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics/stock" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <StockManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics/production" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/procurement/vendors" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <VendorManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quality" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <QualityControlDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <WorkflowDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/orders" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ManufacturingWorkflow />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/orders/new" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <OrderPunching />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/bom" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <BOMManagement />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/gravure" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <GravurePrinting />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/lamination" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <LaminationCoating />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/coating" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <AdhesiveCoating />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/slitting" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <SlittingPackaging />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/cost-analysis" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <CostAnalysisDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manufacturing/tracking" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <UiornTrackingDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics/kpi" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/planning" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <InventoryLayout>
                    <ProductionAnalyticsDashboard />
                  </InventoryLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ai" 
              element={
                <ProtectedRoute>
                  <AIAssistant />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DKEGLAuthProvider>
  </QueryClientProvider>
);

export default App;
