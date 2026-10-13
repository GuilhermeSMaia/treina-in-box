import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, ExternalLink, Calendar, Pencil, Plus, Trash2, X, Save, MoreHorizontal, NotebookPen } from "lucide-react";
import { useLiveSessions, LiveSession } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionForm {
  title: string;
  meeting_url: string;
  scheduled_at: string;
  is_active: boolean;
}

const emptyForm: SessionForm = { title: "", meeting_url: "", scheduled_at: "", is_active: false };

const SessionActions = ({
  session,
  onEdit,
  onDelete,
}: {
  session: LiveSession;
  onEdit: (s: LiveSession) => void;
  onDelete: (s: LiveSession) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onEdit(session)}>
        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(session)} className="text-destructive focus:text-destructive">
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const NotesButton = ({ trainingId, session }: { trainingId?: string; session: LiveSession }) => (
  <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
    <Link to={`/treino/${trainingId}/meu-espaco?aula=${session.id}`} title="Minhas anotações desta aula">
      <NotebookPen className="mr-1.5 h-4 w-4" /> Anotar
    </Link>
  </Button>
);

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

  const createSession = useMutation({
    mutationFn: async () => {
      if (!trainingId) throw new Error("Treinamento não encontrado");
      const { error } = await supabase.from("live_sessions").insert({
        training_id: trainingId,
        title: form.title,
        meeting_url: form.meeting_url || null,
        scheduled_at: form.scheduled_at || null,
        is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Sessão criada");
      closeForm();
      invalidate();
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const updateSession = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("ID não definido");
      const { error } = await supabase.from("live_sessions").update({
        title: form.title,
        meeting_url: form.meeting_url || null,
        scheduled_at: form.scheduled_at || null,
        is_active: form.is_active,
      }).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Sessão atualizada");
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
    if (editingId) updateSession.mutate();
    else createSession.mutate();
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

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Ao Vivo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aulas ao vivo e sessões em tempo real.
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => { closeForm(); setShowForm(true); }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Nova sessão
            </Button>
          )}
        </div>

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
                  <Button type="submit" size="sm" disabled={createSession.isPending || updateSession.isPending}>
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

        {/* Active sessions */}
        {activeSessions.map((session) => (
          <Card key={session.id} className="border-primary/30 border shadow-none">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/treino/${trainingId}/aula/${session.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{session.title}</Link>
                    <Badge variant="default" className="text-xs">Ao Vivo</Badge>
                  </div>
                  {session.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(session.scheduled_at), "dd MMM · HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotesButton trainingId={trainingId} session={session} />
                {session.meeting_url && (
                  <Button size="sm" asChild>
                    <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                      Entrar <ExternalLink className="ml-1" />
                    </a>
                  </Button>
                )}
                {canEdit && <SessionActions session={session} onEdit={startEdit} onDelete={setDeleteTarget} />}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Upcoming sessions */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Próximas sessões</h2>
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="border shadow-none">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Link to={`/treino/${trainingId}/aula/${session.id}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline">{session.title}</Link>
                      {session.scheduled_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(session.scheduled_at), "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotesButton trainingId={trainingId} session={session} />
                    {canEdit && <SessionActions session={session} onEdit={startEdit} onDelete={setDeleteTarget} />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Other sessions */}
        {otherSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Outras sessões</h2>
            {otherSessions.map((session) => (
              <Card key={session.id} className="border shadow-none">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2.5">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Link to={`/treino/${trainingId}/aula/${session.id}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline">{session.title}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">Sem data agendada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotesButton trainingId={trainingId} session={session} />
                    {session.meeting_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                          Entrar <ExternalLink className="ml-1" />
                        </a>
                      </Button>
                    )}
                    {canEdit && <SessionActions session={session} onEdit={startEdit} onDelete={setDeleteTarget} />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !showForm && (
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">
                Nenhuma aula agendada
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {canEdit
                  ? "Clique em \"Nova sessão\" para criar uma aula ao vivo."
                  : "Quando houver uma aula ao vivo, o link aparecerá aqui."}
              </p>
            </CardContent>
          </Card>
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
