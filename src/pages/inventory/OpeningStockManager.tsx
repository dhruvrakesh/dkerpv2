import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { OpeningStockManagementDashboard } from '@/components/inventory/OpeningStockManagementDashboard';

export default function OpeningStockManager() {
  return (
    <InventoryLayout>
      <OpeningStockManagementDashboard />
    </InventoryLayout>
  );
}