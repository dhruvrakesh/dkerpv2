import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { EnterprisePurchaseReport } from '@/components/analytics/EnterprisePurchaseReport';

const PurchaseReportPage: React.FC = () => {
  return (
    <InventoryLayout>
      <EnterprisePurchaseReport />
    </InventoryLayout>
  );
};

export default PurchaseReportPage;