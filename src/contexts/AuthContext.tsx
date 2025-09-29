import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [initTimeout, setInitTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  // Check if this is an OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isCallback = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('token_type');
    setIsOAuthCallback(isCallback);
  }, []);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const newVisibility = !document.hidden;
      const wasVisible = isTabVisible;
      
      if (wasVisible !== newVisibility) {
        setIsTabVisible(newVisibility);
      }
      
      // When tab becomes visible again, validate session without re-initialization
      // Skip this for OAuth callbacks as they need uninterrupted processing
      if (newVisibility && !wasVisible && user && !isOAuthCallback) {
        // Small delay to avoid conflicts with other effects
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session && user) {
              console.warn('Session expired while tab was hidden, signing out');
              signOut();
            }
          }).catch(error => {
            console.error('Error checking session on tab visibility change:', error);
          });
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isOAuthCallback]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Add timeout for Bolt environment, but longer for OAuth callbacks
    const timeoutDelay = isOAuthCallback ? 15000 : 8000; // 15 seconds for OAuth, 8 for regular
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn(`Auth initialization timeout after ${timeoutDelay}ms - forcing completion`);
        setLoading(false);
        // Try to recover session one more time
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && mounted) {
            setUser(session.user);
            loadUserProfile(session.user.id);
          }
        }).catch(() => {
          // Silent fail - user will see login page
        });
      }
    }, timeoutDelay);
    
    setInitTimeout(timeout);
    
    const initializeAuth = async () => {
      // Prevent re-initialization if already initialized and user exists
      if (user && !loading && !isOAuthCallback) {
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Clear timeout since we got a response
        if (timeout) clearTimeout(timeout);
        
        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (timeout) clearTimeout(timeout);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          if (timeout) clearTimeout(timeout);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Skip all non-critical events when tab is hidden or when we already have the user
      // BUT allow OAuth callbacks to proceed regardless of tab visibility
      if ((!isTabVisible && event !== 'SIGNED_OUT' && !isOAuthCallback) || 
          (event === 'SIGNED_IN' && user && session?.user?.id === user.id)) {
        return;
      }
      
      try {
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (authSubscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, [isTabVisible, isOAuthCallback]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ?? undefined };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error ?? undefined };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
      } else {
        setUser(null);
        window.location.reload();
      }
    } catch (error) {
      setUser(null);
      window.location.reload();
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}