import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedStockValuationMaster } from '@/components/pricing/EnhancedStockValuationMaster';
import { PricingVarianceMonitor } from '@/components/pricing/PricingVarianceMonitor';

export default function PricingMasterPage() {
  return (
    <InventoryLayout>
      <div className="space-y-6">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <h2 className="text-lg font-semibold">Pricing Management System</h2>
          </div>
        </div>
        
        <Tabs defaultValue="valuation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="valuation">Stock Valuation Master</TabsTrigger>
            <TabsTrigger value="variance">Variance Monitor</TabsTrigger>
          </TabsList>
          
          <TabsContent value="valuation" className="space-y-4">
            <EnhancedStockValuationMaster />
          </TabsContent>
          
          <TabsContent value="variance" className="space-y-4">
            <PricingVarianceMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </InventoryLayout>
  );
}