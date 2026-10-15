import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Layers, Plus, MoreVertical, Pencil, Pause, Play, Trash2, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notify } from "@/components/feedback/notify";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { SearchInput } from "@/components/SearchInput";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainings, Training } from "@/hooks/useTrainings";
import { useUserRole } from "@/hooks/useUserRole";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type DialogType = null | "training" | "edit";

export default function Treinamentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canManage = isAdminOrOwner || isMentor;
  const { data: trainings, isLoading, isError } = useTrainings();

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogType>(null);

  // Form state (shared for create & edit)
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tCoverFile, setTCoverFile] = useState<File | null>(null);
  const [tCoverPreview, setTCoverPreview] = useState<string | null>(null);
  const [tCoverRemoved, setTCoverRemoved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);

  const uploadCover = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      let coverUrl: string | undefined;
      if (tCoverFile) {
        coverUrl = await uploadCover(tCoverFile);
      }

      if (editingId) {
        const updates: Record<string, unknown> = { title: tTitle, description: tDesc };
        if (coverUrl) {
          updates.cover_url = coverUrl;
        } else if (tCoverRemoved) {
          updates.cover_url = null;
        }
        const { error } = await supabase.from("trainings").update(updates).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainings").insert({
          title: tTitle,
          description: tDesc,
          created_by: user.id,
          ...(coverUrl ? { cover_url: coverUrl } : {}),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      notify.success(editingId ? "Treinamento atualizado" : "Treinamento criado");
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      closeDialog();
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      const { error } = await supabase.from("trainings").update({ is_paused: !isPaused }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isPaused }) => {
      notify.success(isPaused ? "Treinamento reativado" : "Treinamento pausado");
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (err: Error) => notify.error("Erro", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.deleted("Treinamento excluído");
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => notify.error("Erro ao excluir", err.message),
  });

  const closeDialog = () => {
    setDialog(null);
    setTTitle("");
    setTDesc("");
    setTCoverFile(null);
    setTCoverPreview(null);
    setTCoverRemoved(false);
    setEditingId(null);
  };

  const openEdit = (t: Training) => {
    setEditingId(t.id);
    setTTitle(t.title);
    setTDesc(t.description ?? "");
    setTCoverPreview(t.cover_url);
    setTCoverFile(null);
    setTCoverRemoved(false);
    setDialog("edit");
  };

  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      notify.error("Arquivo muito grande", "O tamanho máximo permitido é 3MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setTCoverFile(file);
    setTCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setTCoverFile(null);
    setTCoverPreview(null);
    setTCoverRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = (trainings ?? []).filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isFormDialog = dialog === "training" || dialog === "edit";

  return (
    <AppLayout>
      <div className="min-h-screen bg-lobby p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Treinamentos</h1>
              <p className="text-sm text-gold-muted">
                Explore todos os treinamentos disponíveis na plataforma.
              </p>
            </div>

            {isAdminOrOwner && (
              <Button size="sm" onClick={() => setDialog("training")} className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo Treinamento
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="max-w-md">
            <SearchInput
              placeholder="Buscar treinamento..."
              value={search}
              onChange={setSearch}
              iconClassName="text-gold-muted"
              className="pl-10 bg-lobby-card border-gold/20 text-white placeholder:text-gold-muted/60 focus-visible:ring-gold/40"
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl bg-lobby-card" />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="rounded-xl border border-destructive/40 bg-lobby-card p-8 text-center">
              <p className="text-sm text-destructive">
                Erro ao carregar treinamentos. Tente novamente.
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-gold/20 bg-lobby-card p-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-gold-muted/50 mb-3" />
              <p className="text-sm text-gold-muted">
                {search
                  ? "Nenhum treinamento encontrado para essa busca."
                  : "Nenhum treinamento disponível ainda."}
              </p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="group relative text-left rounded-xl border border-gold/20 bg-lobby-card overflow-hidden transition-all hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10"
                >
                  {/* 3-dot menu */}
                  {canManage && (
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePause.mutate({ id: t.id, isPaused: t.is_paused })}>
                            {t.is_paused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
                            {t.is_paused ? "Reativar" : "Pausar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Paused badge */}
                  {t.is_paused && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Pause className="mr-1 h-3 w-3" /> Pausado
                      </Badge>
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/treino/${t.id}/aulas`)}
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {t.cover_url ? (
                      <div className="h-32 w-full overflow-hidden">
                        <img src={t.cover_url} alt={t.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-gold/5 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-gold-muted/30" />
                      </div>
                    )}

                    <div className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</h3>
                      {t.description && <p className="text-xs text-gold-muted line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-1 text-[11px] text-gold-muted/70">
                        <Calendar className="h-3 w-3" />
                        <span>Criado em {format(new Date(t.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Criar / Editar Treinamento */}
      <Dialog open={isFormDialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="bg-lobby-card border-gold/20 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            {/* Cover upload */}
            <div className="space-y-1.5">
              <Label className="text-gold-muted">Imagem de capa</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {tCoverPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gold/20">
                  <img src={tCoverPreview} alt="Capa" className="w-full h-36 object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 bg-black/60 text-white hover:bg-black/80 hover:text-white"
                    onClick={removeCover}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 rounded-lg border-2 border-dashed border-gold/20 bg-lobby flex flex-col items-center justify-center gap-2 text-gold-muted hover:border-gold/40 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Clique para enviar uma imagem</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gold-muted">Título</Label>
              <Input value={tTitle} onChange={(e) => setTTitle(e.target.value)} required className="bg-lobby border-gold/20 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gold-muted">Descrição</Label>
              <Textarea value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={3} className="bg-lobby border-gold/20 text-white" />
            </div>
            <Button type="submit" disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending
                ? (editingId ? "Salvando..." : "Criando...")
                : (editingId ? "Salvar Alterações" : "Criar Treinamento")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Excluir treinamento?"
        description={
          <>
            Esta ação é irreversível. O treinamento <strong className="text-white">"{deleteTarget?.title}"</strong> e
            todos os seus módulos, aulas e vínculos serão removidos.
          </>
        }
        isPending={deleteMutation.isPending}
        className="bg-lobby-card border-gold/20 text-white"
        descriptionClassName="text-gold-muted"
        cancelClassName="border-gold/20 text-gold-muted hover:bg-gold/10"
      />
    </AppLayout>
  );
}
