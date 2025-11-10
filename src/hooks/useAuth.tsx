import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  usn: string | null;
  role: 'STUDENT' | 'COE' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Safety timeout - if loading is still true after 10 seconds, force it to false
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[Auth] State changed:', event, 'User ID:', session?.user?.id);

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out, clearing state');
          setProfile(null);
          setLoading(false);
        } else if (session?.user) {
          console.log('[Auth] User session found, fetching profile');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('[Auth] No session, clearing state');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      console.log('[Auth] Initial session check:', session ? 'Found' : 'Not found');

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('[Auth] Error getting session:', error);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('[Auth] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('User profile not found');
      }

      console.log('[Auth] Profile loaded successfully:', data.role);
      setProfile(data);
    } catch (error: any) {
      console.error('[Auth] Error fetching profile:', error);

      // If profile fetch fails, sign out the user to prevent stuck state
      toast.error('Failed to load user profile. Please sign in again.');
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setSession(null);
    } finally {
      console.log('[Auth] Setting loading to false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out...');

      // Clear state immediately for better UX
      setProfile(null);
      setUser(null);
      setSession(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('[Auth] Sign out successful');
      toast.success('Signed out successfully');

      // Navigate to auth page
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('[Auth] Error signing out:', error);
      toast.error('Failed to sign out');

      // Even if there's an error, try to navigate to auth
      navigate('/auth', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
