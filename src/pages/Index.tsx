import React from 'react';
import { ERPSidebar } from '@/components/layout/ERPSidebar';
import { ERPTopBar } from '@/components/layout/ERPTopBar';
import { ERPDashboard } from '@/components/dashboard/ERPDashboard';

const Index = () => {
  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ERPSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ERPTopBar />
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto">
          <ERPDashboard />
        </main>
      </div>
    </div>
  );
};

export default Index;
