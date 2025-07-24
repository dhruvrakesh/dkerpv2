import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DKEGLAuthForm } from '@/components/auth/DKEGLAuthForm';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

const DKEGLAuth = () => {
  const { user, loading } = useDKEGLAuth();
  const navigate = useNavigate();

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading DKEGL ERP...</span>
        </div>
      </div>
    );
  }

  return <DKEGLAuthForm />;
};

export default DKEGLAuth;