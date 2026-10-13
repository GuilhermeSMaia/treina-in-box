import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/feedback/PageLoader";
import { AccessDenied } from "@/components/feedback/AccessDenied";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const { isBlocked, isLoadingStatus } = useEnrollmentStatus();

  if (loading || (session && isLoadingStatus)) return <PageLoader />;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (isBlocked) {
    return (
      <AccessDenied
        description="Sua conta não possui um convite válido para acessar esta plataforma. Entre em contato com o administrador."
        action={
          <Button variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
