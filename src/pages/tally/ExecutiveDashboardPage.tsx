import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { ExecutiveDashboard } from '@/components/analytics/ExecutiveDashboard';

const ExecutiveDashboardPage: React.FC = () => {
  return (
    <InventoryLayout>
      <ExecutiveDashboard />
    </InventoryLayout>
  );
};

export default ExecutiveDashboardPage;