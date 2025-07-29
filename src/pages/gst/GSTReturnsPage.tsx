import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { GSTReturnsGuru } from '@/components/gst/GSTReturnsGuru';

const GSTReturnsPage: React.FC = () => {
  return (
    <InventoryLayout>
      <GSTReturnsGuru />
    </InventoryLayout>
  );
};

export default GSTReturnsPage;