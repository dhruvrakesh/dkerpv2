import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DKEGLAuthContextType {
  user: User | null;
  session: Session | null;
  organization: any | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DKEGLAuthContext = createContext<DKEGLAuthContextType | undefined>(undefined);

export const useDKEGLAuth = () => {
  const context = useContext(DKEGLAuthContext);
  if (context === undefined) {
    throw new Error('useDKEGLAuth must be used within a DKEGLAuthProvider');
  }
  return context;
};

interface DKEGLAuthProviderProps {
  children: ReactNode;
}

export const DKEGLAuthProvider = ({ children }: DKEGLAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('dkegl_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);

        // Fetch organization details
        if (profile.organization_id) {
          const { data: org } = await supabase
            .from('dkegl_organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();
          
          setOrganization(org);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid auth state change issues
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
          setOrganization(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Welcome Back!",
          description: "Successfully signed in to DKEGL ERP",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Error",
        description: "An unexpected error occurred",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: error.message,
          });
        }
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Error",
        description: "An unexpected error occurred",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setOrganization(null);
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    organization,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <DKEGLAuthContext.Provider value={value}>
      {children}
    </DKEGLAuthContext.Provider>
  );
};