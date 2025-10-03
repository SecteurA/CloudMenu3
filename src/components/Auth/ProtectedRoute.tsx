import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingMenu, setCheckingMenu] = useState(false);
  const [hasMenu, setHasMenu] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [emergencyTimeout, setEmergencyTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  /// Check if this is an OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isCallback = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('token_type');
    setIsOAuthCallback(isCallback);
  }, []);

  // Emergency timeout for Bolt environment
  useEffect(() => {
    // Don't set emergency timeout for OAuth callbacks - they need more time
    if (isOAuthCallback) return;
    
    const timeout = setTimeout(() => {
      if ((checkingMenu || loading) && mounted) {
        console.warn('Emergency timeout - forcing state completion');
        setCheckingMenu(false);
        // Don't force reload immediately - let auth context handle it
      }
    }, 10000); // Increased timeout to 10 seconds for better reliability
      
    setEmergencyTimeout(timeout);
    return () => {
      clearTimeout(timeout);
      setEmergencyTimeout(null);
    };
  }, [checkingMenu, loading, mounted, isOAuthCallback]);

  // Handle tab visibility to prevent unnecessary effects
  useEffect(() => {
    const handleVisibilityChange = () => {
      const newVisibility = !document.hidden;
      if (newVisibility !== isTabVisible) {
        setIsTabVisible(newVisibility);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTabVisible]);

  // Check if user has a menu
  useEffect(() => {
    let isMounted = true;
    
    // Prevent duplicate menu checks when we already have the result and tab is visible
    if (hasMenu !== null && user && !loading && isTabVisible) {
      return;
    }
    
    // Skip menu check if tab is hidden and we already have a user
    if (!isTabVisible && user && hasMenu !== null) {
      return;
    }
    
    const checkUserMenu = async () => {
      if (!user || loading) {
        return;
      }
      
      // Skip menu check if already on onboarding or if we recently checked
      if (window.location.pathname === '/onboarding') {
        if (isMounted) {
          setHasMenu(false);
        }
        return;
      }
      
      // Throttle menu checks to avoid excessive loading states
      const now = Date.now();
      const lastMenuCheck = sessionStorage.getItem('lastMenuCheck');
      const timeSinceLastCheck = now - (lastMenuCheck ? parseInt(lastMenuCheck) : 0);
      
      // If we checked recently (less than 5 minutes) and have a result, don't check again
      if (timeSinceLastCheck < 5 * 60 * 1000 && hasMenu !== null) {
        return;
      }
      
      // Don't show loading state during navigation if we already have menu status
      const shouldShowLoading = hasMenu === null && window.location.pathname !== '/onboarding';
      
      if (shouldShowLoading) {
        setCheckingMenu(true);
      }
      sessionStorage.setItem('lastMenuCheck', now.toString());
      
      try {
        const { data, error } = await supabase
          .from('restaurant_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking restaurant profile:', error);
          setHasMenu(false);
          navigate('/onboarding', { replace: true });
          return;
        }

        const profileExists = !!data;
        setHasMenu(profileExists);

        if (!profileExists && window.location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        if (!isMounted) return;

        console.error('Exception during profile check:', error);
        setHasMenu(false);
        navigate('/onboarding', { replace: true });
      } finally {
        if (isMounted && shouldShowLoading) {
          setCheckingMenu(false);
        }
      }
    };

    checkUserMenu();

    return () => {
      isMounted = false;
    };
  }, [user, loading, navigate, hasMenu, isTabVisible, isOAuthCallback]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      setMounted(false);
      if (emergencyTimeout) {
        clearTimeout(emergencyTimeout);
      }
    };
  }, [emergencyTimeout]);

  // Show loading while auth is initializing or checking menu
  // Only show loading on first visit or when actually needed
  const shouldShowAuthLoading = loading && (!user || hasMenu === null);
  const shouldShowMenuLoading = checkingMenu && hasMenu === null;
  
  if (shouldShowAuthLoading || shouldShowMenuLoading) {
    // Special handling for OAuth callbacks - show more specific message
    const loadingMessage = isOAuthCallback 
      ? 'Finalisation de la connexion...' 
      : shouldShowAuthLoading
        ? 'Chargement...' 
        : shouldShowMenuLoading
          ? 'Vérification du compte...' 
          : 'Initialisation...';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{loadingMessage}</span>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // If we're still checking menu status and not on onboarding, show loading
  // Only show this loading state on first visit
  if (hasMenu === null && window.location.pathname !== '/onboarding' && !sessionStorage.getItem('lastMenuCheck')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Vérification du compte...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;