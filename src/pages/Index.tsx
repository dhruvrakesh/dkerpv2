import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPSidebar } from '@/components/layout/ERPSidebar';
import { ERPTopBar } from '@/components/layout/ERPTopBar';
import { ERPDashboard } from '@/components/dashboard/ERPDashboard';
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
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto">
          <ERPDashboard />
        </main>
      </div>
    </div>
  );
};

export default Index;
