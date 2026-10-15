import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoader } from "@/components/feedback/PageLoader";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) return <PageLoader />;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Allow owner, admin, and mentor to access settings
  // if (!isAdminOrOwner && !isMentor) {
  //   return <Navigate to="/lobby" replace />;
  // }

  return <>{children}</>;
}
