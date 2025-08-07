import React, { useState } from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { OpeningStockManagementDashboard } from '@/components/inventory/OpeningStockManagementDashboard';
import { EnhancedOpeningStockDashboard } from '@/components/inventory/EnhancedOpeningStockDashboard';
import { EnterpriseStockAnalyticsDashboard } from '@/components/inventory/EnterpriseStockAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OpeningStockManager() {
  return (
    <InventoryLayout>
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Stock Analytics</TabsTrigger>
          <TabsTrigger value="opening-stock">Opening Stock</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <EnterpriseStockAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="opening-stock">
          <EnhancedOpeningStockDashboard />
        </TabsContent>

        <TabsContent value="management">
          <OpeningStockManagementDashboard />
        </TabsContent>
      </Tabs>
    </InventoryLayout>
  );
}