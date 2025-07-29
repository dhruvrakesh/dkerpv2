import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { GSTComplianceCenter } from '@/components/gst/GSTComplianceCenter';

const GSTCompliancePage: React.FC = () => {
  return (
    <InventoryLayout>
      <GSTComplianceCenter />
    </InventoryLayout>
  );
};

export default GSTCompliancePage;