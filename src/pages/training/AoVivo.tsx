import { useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Plus, X, Save } from "lucide-react";
import { useLiveSessions, LiveSession } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";
import { PageHeader } from "@/components/PageHeader";
import { SessionCard } from "@/components/live/SessionCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SessionForm {
  title: string;
  meeting_url: string;
  scheduled_at: string;
  is_active: boolean;
}

const emptyForm: SessionForm = { title: "", meeting_url: "", scheduled_at: "", is_active: false };

const AoVivo = () => {
  const { trainingId } = useParams();
  const { data: sessions, isLoading } = useLiveSessions(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canEdit = isAdminOrOwner || isMentor;
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveSession | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["live-sessions", trainingId] });

  const saveSession = useMutation({
    mutationFn: async () => {
      if (!trainingId) throw new Error("Treinamento não encontrado");
      const values = {
        title: form.title,
        meeting_url: form.meeting_url || null,
        scheduled_at: form.scheduled_at || null,
        is_active: form.is_active,
      };
      const { error } = editingId
        ? await supabase.from("live_sessions").update(values).eq("id", editingId)
        : await supabase.from("live_sessions").insert({ ...values, training_id: trainingId });
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success(editingId ? "Sessão atualizada" : "Sessão criada");
      closeForm();
      invalidate();
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
    setEditingId(s.id);
    setForm({
      title: s.title,
      meeting_url: s.meeting_url ?? "",
      scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : "",
      is_active: s.is_active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSession.mutate();
  };

  const activeSessions = sessions?.filter((s) => s.is_active) ?? [];
  const upcomingSessions = sessions?.filter((s) => !s.is_active && s.scheduled_at) ?? [];
  const otherSessions = sessions?.filter((s) => !s.is_active && !s.scheduled_at) ?? [];

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

  const isEmpty = !activeSessions.length && !upcomingSessions.length && !otherSessions.length;
  const cardActions = canEdit ? { onEdit: startEdit, onDelete: setDeleteTarget } : {};
  const sections = [
    { title: "Próximas sessões", items: upcomingSessions, variant: "upcoming" as const },
    { title: "Outras sessões", items: otherSessions, variant: "other" as const },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Ao Vivo"
          description="Aulas ao vivo e sessões em tempo real."
          action={
            canEdit && (
              <Button size="sm" onClick={() => { closeForm(); setShowForm(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Nova sessão
              </Button>
            )
          }
        />

        {/* Form */}
        {showForm && (
          <Card className="border-primary/20 border shadow-none">
            <CardContent className="py-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    {editingId ? "Editar sessão" : "Nova sessão"}
                  </h3>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Ex: Aula 01 — Introdução"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL da reunião</Label>
                    <Input
                      value={form.meeting_url}
                      onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data e hora</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label>Ao vivo agora</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saveSession.isPending}>
                    <Save className="mr-1.5 h-4 w-4" />
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={closeForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
