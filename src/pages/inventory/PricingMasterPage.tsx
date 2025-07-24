import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import PricingMaster from './PricingMaster';

export default function PricingMasterPage() {
  return (
    <InventoryLayout>
      <PricingMaster />
    </InventoryLayout>
  );
}