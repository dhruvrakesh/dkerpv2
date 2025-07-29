import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { GSTDashboard } from '@/components/gst/GSTDashboard';

const GSTDashboardPage: React.FC = () => {
  return (
    <InventoryLayout>
      <GSTDashboard />
    </InventoryLayout>
  );
};

export default GSTDashboardPage;