import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/feedback/PageLoader";
import { AccessDenied } from "@/components/feedback/AccessDenied";

export function TrainingGuard({ children }: { children: React.ReactNode }) {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const { isAdminOrOwner, isLoading: rolesLoading } = useUserRole();

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ["training-access", trainingId, user?.id],
    queryFn: async () => {
      if (!trainingId || !user?.id) return false;
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("id")
        .eq("training_id", trainingId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!trainingId && !!user?.id && !isAdminOrOwner,
  });

  if (rolesLoading || (!isAdminOrOwner && isLoading)) return <PageLoader />;

  if (isAdminOrOwner || hasAccess) {
    return <>{children}</>;
  }

  return (
    <AccessDenied
      description="Você não está inscrito neste treinamento. Solicite acesso ao mentor ou administrador."
      action={
        <Button variant="outline" asChild>
          <Link to="/treinamentos">Voltar aos treinamentos</Link>
        </Button>
      }
    />
  );
}
