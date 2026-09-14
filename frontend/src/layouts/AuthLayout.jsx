import { Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/ui/Skeleton';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Skeleton className="h-96 w-96" />
      </div>
    );
  }

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Skeleton className="h-96 w-96" />
      </div>
    }>
      <Outlet />
    </Suspense>
  );
}