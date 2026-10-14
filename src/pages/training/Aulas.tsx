import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Plus } from "lucide-react";
import { useLiveSessions, LiveSession, SessionStatus, getSessionStatus } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";
import { PageHeader } from "@/components/PageHeader";
import { SessionCard } from "@/components/live/SessionCard";
import { SessionForm, SessionFormValues } from "@/components/live/SessionForm";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AoVivo = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useLiveSessions(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canEdit = isAdminOrOwner || isMentor;
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveSession | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["live-sessions", trainingId] });

  const saveSession = useMutation({
    mutationFn: async (form: SessionFormValues) => {
      if (!trainingId) throw new Error("Treinamento não encontrado");
      const values = {
        title: form.title,
        meeting_url: form.meeting_url || null,
        // O input datetime-local não tem fuso: new Date() o lê no horário local e toISOString() envia em UTC
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("live_sessions").update(values).eq("id", editing.id);
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase
        .from("live_sessions")
        .insert({ ...values, training_id: trainingId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (createdId, form) => {
      notify.success(editing ? "Sessão atualizada" : "Sessão criada");
      closeForm();
      invalidate();
      // Aula que não é ao vivo nasce sem material: leva direto para publicar o conteúdo dela
      if (createdId && !form.is_active) navigate(`/treino/${trainingId}/conteudo?aula=${createdId}`);
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.deleted("Sessão excluída");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const startEdit = (s: LiveSession) => {
    setEditing(s);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
  };

  const byStatus = (status: SessionStatus) => sessions?.filter((s) => getSessionStatus(s) === status) ?? [];
  const activeSessions = byStatus("live");
  const upcomingSessions = byStatus("upcoming");
  // Mais recentes primeiro
  const pastSessions = byStatus("past").reverse();
  const otherSessions = byStatus("content");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  const isEmpty = !sessions?.length;
  const cardActions = canEdit ? { onEdit: startEdit, onDelete: setDeleteTarget } : {};
  const sections = [
    { title: "Próximas sessões", items: upcomingSessions, variant: "upcoming" as const },
    { title: "Aulas realizadas", items: pastSessions, variant: "past" as const },
    { title: "Aulas de conteúdo", items: otherSessions, variant: "other" as const },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Aulas"
          description="Aulas ao vivo, agendadas e realizadas."
          action={
            canEdit && (
              <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Nova sessão
              </Button>
            )
          }
        />

        {showForm && (
          <SessionForm
            key={editing?.id ?? "new"}
            session={editing}
            isPending={saveSession.isPending}
            onSubmit={(values) => saveSession.mutate(values)}
            onCancel={closeForm}
          />
        )}

        {activeSessions.map((session) => (
          <SessionCard key={session.id} session={session} trainingId={trainingId} variant="active" {...cardActions} />
        ))}

        {sections.map(
          ({ title, items, variant }) =>
            items.length > 0 && (
              <div key={variant} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
                {items.map((session) => (
                  <SessionCard key={session.id} session={session} trainingId={trainingId} variant={variant} {...cardActions} />
                ))}
              </div>
            )
        )}

        {isEmpty && !showForm && (
          <EmptyState
            icon={Video}
            title="Nenhuma aula agendada"
            description={
              canEdit
                ? "Clique em \"Nova sessão\" para criar uma aula ao vivo."
                : "Quando houver uma aula ao vivo, o link aparecerá aqui."
            }
          />
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteSession.mutate(deleteTarget.id)}
        title="Excluir sessão?"
        description={`A sessão "${deleteTarget?.title ?? ""}" será removida permanentemente. Conteúdos e anotações vinculados a ela ficarão sem aula.`}
        isPending={deleteSession.isPending}
      />
    </AppLayout>
  );
};

export default AoVivo;
