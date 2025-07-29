import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { EnhancedStockAnalyticsDashboard } from '@/components/analytics/EnhancedStockAnalyticsDashboard';

export default function EnterpriseStockManagement() {
  return (
    <InventoryLayout>
      <EnhancedStockAnalyticsDashboard />
    </InventoryLayout>
  );
}