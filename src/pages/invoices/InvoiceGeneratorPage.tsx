import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { InvoiceGenerator } from '@/components/invoices/InvoiceGenerator';

const InvoiceGeneratorPage: React.FC = () => {
  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Generator</h1>
          <p className="text-muted-foreground">
            Create GST-compliant invoices with automated tax calculations
          </p>
        </div>
        <InvoiceGenerator />
      </div>
    </InventoryLayout>
  );
};

export default InvoiceGeneratorPage;