import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('STUDENT' | 'COE' | 'ADMIN')[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  console.log('[ProtectedRoute] Auth state:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    role: profile?.role,
    allowedRoles
  });

  // Show loading skeleton while checking authentication
  if (loading) {
    console.log('[ProtectedRoute] Showing loading skeleton');
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user || !profile) {
    console.log('[ProtectedRoute] No user/profile, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    console.log('[ProtectedRoute] User role not allowed, redirecting');
    // Redirect to appropriate dashboard based on role
    if (profile.role === 'COE') {
      return <Navigate to="/coe/requests" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }

  console.log('[ProtectedRoute] Rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
