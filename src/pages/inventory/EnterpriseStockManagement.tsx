import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { EnterpriseStockDashboard } from '@/components/inventory/EnterpriseStockDashboard';

export default function EnterpriseStockManagement() {
  return (
    <InventoryLayout>
      <EnterpriseStockDashboard />
    </InventoryLayout>
  );
}