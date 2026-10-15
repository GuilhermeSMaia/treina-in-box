import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTableCard } from "@/components/settings/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface TrainingRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export function TrainingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("id, title, description, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      if (editingId) {
        const { error } = await supabase.from("trainings").update({ title, description }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainings").insert({ title, description, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      notify.success(editingId ? "Treinamento atualizado" : "Treinamento criado");
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.deleted("Treinamento excluído");
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (err: Error) => notify.error("Erro ao excluir", err.message),
  });

  const resetForm = () => { setEditingId(null); setTitle(""); setDescription(""); };

  const openEdit = (t: TrainingRow) => {
    setEditingId(t.id);
    setTitle(t.title);
    setDescription(t.description ?? "");
    setDialogOpen(true);
  };

  return (
    <>
      <DataTableCard
        title="Treinamentos"
        description="Crie, edite ou exclua treinamentos."
        headerAction={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full">
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
        items={trainings}
        getRowKey={(t) => t.id}
        isLoading={isLoading}
        emptyMessage="Nenhum treinamento criado."
        columns={[
          { header: "Título", cellClassName: "font-medium", cell: (t) => t.title },
          {
            header: "Descrição",
            cellClassName: "max-w-48 truncate text-xs text-muted-foreground",
            cell: (t) => t.description || "—",
          },
          {
            header: "Criado em",
            cellClassName: "text-xs text-muted-foreground",
            cell: (t) => new Date(t.created_at).toLocaleDateString("pt-BR"),
          },
          {
            header: "Ações",
            className: "text-right",
            cellClassName: "space-x-2",
            cell: (t) => (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(t)} aria-label="Editar treinamento">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTargetId(t.id)} aria-label="Excluir treinamento">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            ),
          },
        ]}
      />

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(o) => !o && setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && remove.mutate(deleteTargetId)}
        title="Excluir treinamento?"
        description="Esta ação é irreversível. Todos os módulos, aulas e vínculos serão removidos."
        isPending={remove.isPending}
      />
    </>
  );
}
