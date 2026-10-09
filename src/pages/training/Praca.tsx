import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatMessage } from "@/components/chat/chat-utils";
import { usePlazaPosts } from "@/hooks/usePlazaPosts";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { useAuth } from "@/contexts/AuthContext";

const Praca = () => {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadFile } = usePlazaPosts(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const { isExpired } = useEnrollmentStatus();
  const canModerate = isAdminOrOwner || isMentor;

  const messages = useMemo<ChatMessage[]>(
    () =>
      posts.map((post) => ({
        ...post,
        author: { name: post.profile?.username ?? null, avatar_url: post.profile?.avatar_url ?? null },
      })),
    [posts]
  );

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2.75rem)] bg-chat-page">
        <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pt-6 pb-4 sm:px-6 lg:px-8">
          <div className="pb-4">
            <h1 className="text-xl font-semibold text-foreground">Praça</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Espaço de interação e troca entre participantes.
            </p>
          </div>

          <ChatPanel
            className="flex-1"
            messages={messages}
            currentUserId={user?.id}
            isLoading={isLoading}
            canPost={!isExpired}
            readOnlyNotice="Seu acesso expirou — você está em modo apenas leitura."
            placeholder="Escreva uma mensagem para a turma..."
            emptyState={{
              title: "Nenhuma mensagem ainda",
              description: "Seja o primeiro a compartilhar algo com a turma!",
            }}
            onUploadFile={uploadFile}
            onSend={async (content, attachments) => {
              try {
                await createPost.mutateAsync({ content, attachments });
                return true;
              } catch {
                return false;
              }
            }}
            onEdit={async (id, content, attachments) => {
              try {
                await updatePost.mutateAsync({ id, content, attachments });
                return true;
              } catch {
                return false;
              }
            }}
            onDelete={async (id) => {
              try {
                await deletePost.mutateAsync(id);
                return true;
              } catch {
                return false;
              }
            }}
            canEditMessage={(_, isOwn) => (isOwn && !isExpired) || canModerate}
            canDeleteMessage={(_, isOwn) => isOwn || canModerate}
            isSending={createPost.isPending}
            isSavingEdit={updatePost.isPending}
            isDeleting={deletePost.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Praca;
