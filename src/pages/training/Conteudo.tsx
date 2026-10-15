import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ContentPostCard } from "@/components/content/ContentPostCard";
import { ContentForm, ContentFormValues } from "@/components/content/ContentForm";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { useContentPosts } from "@/hooks/useContentPosts";
import { useLiveSessions } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";

const Conteudo = () => {
  const { trainingId } = useParams();
  // Vindo da tela da aula (?aula=<id>), o novo conteúdo já começa vinculado a ela
  const [searchParams] = useSearchParams();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadFile } = useContentPosts(trainingId);
  const { data: sessions = [] } = useLiveSessions(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canEdit = isAdminOrOwner || isMentor;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handlePublish = async (values: ContentFormValues) => {
    try {
      await createPost.mutateAsync(values);
      notify.success("Conteúdo publicado", "Ele já está disponível para a turma.");
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveEdit = async (values: ContentFormValues) => {
    if (!editingId) return false;
    try {
      await updatePost.mutateAsync({ id: editingId, ...values });
      setEditingId(null);
      notify.success("Conteúdo atualizado");
      return true;
    } catch {
      return false;
    }
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deletePost.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteTargetId(null);
        notify.deleted("Conteúdo excluído");
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <PageHeader title="Conteúdo" description="Materiais e recursos publicados pela equipe do treinamento." />

        {canEdit && (
          <Card className="border shadow-none">
            <CardContent className="pt-5 pb-4">
              <ContentForm
                sessions={sessions}
                initial={{ session_id: searchParams.get("aula") }}
                placeholder="Publique um novo conteúdo..."
                submitLabel="Publicar"
                isPending={createPost.isPending}
                onUploadFile={uploadFile}
                onSubmit={handlePublish}
                resetOnSubmit
              />
            </CardContent>
          </Card>
        )}

        {posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Conteúdo em breve"
            description="Os conteúdos aparecerão aqui quando forem publicados pela equipe."
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <ContentPostCard
                key={post.id}
                post={post}
                session={post.session_id ? sessionById.get(post.session_id) : undefined}
                trainingId={trainingId}
                onEdit={canEdit ? () => setEditingId(post.id) : undefined}
                onDelete={canEdit ? () => setDeleteTargetId(post.id) : undefined}
              >
                {editingId === post.id ? (
                  <ContentForm
                    sessions={sessions}
                    initial={post}
                    placeholder="Edite o conteúdo..."
                    submitLabel="Salvar"
                    isPending={updatePost.isPending}
                    onUploadFile={uploadFile}
                    onSubmit={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : undefined}
              </ContentPostCard>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Excluir conteúdo?"
        description="Este conteúdo será removido permanentemente. Esta ação não pode ser desfeita."
        isPending={deletePost.isPending}
      />
    </AppLayout>
  );
};

export default Conteudo;
