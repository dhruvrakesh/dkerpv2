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
        
        {/* Dashboard Content with Enhanced Tabs */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="fade-in">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 glass-card">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  <span className="hidden sm:inline">Manufacturing Overview</span>
                  <span className="sm:hidden">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="realtime"
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-300"
                >
                  <span className="hidden sm:inline">Live Updates</span>
                  <span className="sm:hidden">Live</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 slide-up">
                <ERPDashboard />
              </TabsContent>

              <TabsContent value="realtime" className="space-y-6 slide-up">
                <RealtimeDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
