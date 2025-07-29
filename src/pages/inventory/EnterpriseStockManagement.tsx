import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { EnterpriseStockManagementDashboard } from '@/components/inventory/EnterpriseStockManagementDashboard';

export default function EnterpriseStockManagement() {
  return (
    <InventoryLayout>
      <EnterpriseStockManagementDashboard />
    </InventoryLayout>
  );
}