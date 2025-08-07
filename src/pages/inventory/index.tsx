import React from 'react';
import { Routes, Route } from 'react-router-dom';
import InventoryDashboard from './InventoryDashboard';
import { ItemMaster } from './ItemMaster';
import { EnterpriseItemMaster } from './EnterpriseItemMaster';
import StockManagement from './StockManagement';
import EnterpriseStockManagement from './EnterpriseStockManagement';
import OpeningStockManager from './OpeningStockManager';
import StockValuationPage from './StockValuationPage';
import PricingMasterPage from './PricingMasterPage';
import GRNManagement from './GRNManagement';
import IssueManagement from './IssueManagement';
import GRNDashboard from './GRNDashboard';
import IssueDashboard from './IssueDashboard';

export default function InventoryRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InventoryDashboard />} />
      <Route path="/item-master" element={<ItemMaster />} />
      <Route path="/enterprise-item-master" element={<EnterpriseItemMaster />} />
      <Route path="/stock-management" element={<StockManagement />} />
      <Route path="/enterprise-stock-management" element={<EnterpriseStockManagement />} />
      <Route path="/opening-stock" element={<OpeningStockManager />} />
      <Route path="/stock-valuation" element={<StockValuationPage />} />
      <Route path="/pricing-master" element={<PricingMasterPage />} />
      <Route path="/grn-management" element={<GRNDashboard />} />
      <Route path="/issue-management" element={<IssueDashboard />} />
    </Routes>
  );
}