import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { AppLayout } from "@/components/AppLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LobbyMetrics } from "@/components/lobby/LobbyMetrics";
import { LobbyTrainings } from "@/components/lobby/LobbyTrainings";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const Lobby = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useDashboardData();
  const {data: profile} = useProfile();
  const firstName = profile?.username?.split(" ")[0] || "Usuário";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };
 console.log("Lobby data:", data);
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 min-h-screen bg-lobby">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-gold-muted mt-1">
            Acompanhe seu progresso e treinamentos ativos.
          </p>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Erro ao carregar dados.</span>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : data ? (
          <LobbyMetrics data={data} />
        ) : null}

        {/* Trainings */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : data ? (
          <LobbyTrainings
            trainings={data.trainings}
            onNavigate={(id) => navigate(`/treino/${id}/ao-vivo`)}
          />
        ) : null}

      </div>
    </AppLayout>
  );
};

export default Lobby;
