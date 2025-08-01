import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { GRNPricingAnalytics } from '@/components/pricing/GRNPricingAnalytics';

export default function GRNPricingDashboard() {
  return (
    <InventoryLayout>
      <GRNPricingAnalytics />
    </InventoryLayout>
  );
}