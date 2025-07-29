import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { EnterpriseSalesReport } from '@/components/analytics/EnterpriseSalesReport';

const SalesReportPage: React.FC = () => {
  return (
    <InventoryLayout>
      <EnterpriseSalesReport />
    </InventoryLayout>
  );
};

export default SalesReportPage;