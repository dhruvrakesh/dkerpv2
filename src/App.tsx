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
import ItemMaster from "./pages/inventory/ItemMaster";
import GRNManagement from "./pages/inventory/GRNManagement";
import IssueManagement from "./pages/inventory/IssueManagement";
import StockManagement from "./pages/inventory/StockManagement";

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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DKEGLAuthProvider>
  </QueryClientProvider>
);

export default App;
