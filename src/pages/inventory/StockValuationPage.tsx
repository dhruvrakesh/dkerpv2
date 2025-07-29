import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { StockValuationDashboard } from '@/components/inventory/StockValuationDashboard';

export default function StockValuationPage() {
  return (
    <InventoryLayout>
      <StockValuationDashboard />
    </InventoryLayout>
  );
}