import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import TallyDashboard from '@/components/dashboard/TallyDashboard';

const TallyDashboardPage: React.FC = () => {
  return (
    <InventoryLayout>
      <TallyDashboard />
    </InventoryLayout>
  );
};

export default TallyDashboardPage;