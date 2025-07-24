import React, { ReactNode } from 'react';
import { ERPSidebar } from '@/components/layout/ERPSidebar';
import { ERPTopBar } from '@/components/layout/ERPTopBar';

interface InventoryLayoutProps {
  children: ReactNode;
}

export const InventoryLayout = ({ children }: InventoryLayoutProps) => {
  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ERPSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ERPTopBar />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};