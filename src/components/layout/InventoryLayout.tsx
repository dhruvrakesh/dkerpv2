import React, { ReactNode } from 'react';
import { ModernSidebar } from '@/components/layout/ModernSidebar';
import { ERPTopBar } from '@/components/layout/ERPTopBar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface InventoryLayoutProps {
  children: ReactNode;
}

export const InventoryLayout = ({ children }: InventoryLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ModernSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar with Sidebar Trigger */}
          <header className="h-16 flex items-center border-b border-border px-4">
            <SidebarTrigger className="mr-4" />
            <ERPTopBar />
          </header>
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};