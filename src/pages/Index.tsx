import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPSidebar } from '@/components/layout/ERPSidebar';
import { ERPTopBar } from '@/components/layout/ERPTopBar';
import { ERPDashboard } from '@/components/dashboard/ERPDashboard';
import { RealtimeDashboard } from '@/components/dashboard/RealtimeDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

const Index = () => {
  const { user } = useDKEGLAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // ProtectedRoute will handle this, but just in case
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ERPSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ERPTopBar />
        
        {/* Dashboard Content with Tabs */}
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Manufacturing Overview</TabsTrigger>
              <TabsTrigger value="realtime">Live Updates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <ERPDashboard />
            </TabsContent>

            <TabsContent value="realtime" className="space-y-6">
              <RealtimeDashboard />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Index;
