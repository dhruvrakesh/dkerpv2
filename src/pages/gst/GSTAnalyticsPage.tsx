import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { GSTAnalytics } from '@/components/gst/GSTAnalytics';

const GSTAnalyticsPage: React.FC = () => {
  return (
    <InventoryLayout>
      <GSTAnalytics />
    </InventoryLayout>
  );
};

export default GSTAnalyticsPage;