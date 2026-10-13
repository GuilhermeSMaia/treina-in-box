import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, Video } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpacePosts } from "@/hooks/useSpacePosts";
import { useLiveSessions } from "@/hooks/useLiveSessions";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { useAuth } from "@/contexts/AuthContext";

const GENERAL = "geral";

const MeuEspaco = () => {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadFile } = useSpacePosts(trainingId);
  const { data: sessions = [], isLoading: isLoadingSessions } = useLiveSessions(trainingId);
  const { isExpired } = useEnrollmentStatus();

  const requestedSession = searchParams.get("aula");
  // Aula inexistente (ex.: excluída) volta para as anotações gerais
  const sessionId =
    requestedSession && (isLoadingSessions || sessions.some((s) => s.id === requestedSession))
      ? requestedSession
      : null;
  const session = sessions.find((s) => s.id === sessionId);

  const messages = useMemo(() => posts.filter((p) => p.session_id === sessionId), [posts, sessionId]);

  const selectSession = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === GENERAL) next.delete("aula");
        else next.set("aula", value);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2.75rem)] bg-chat-page">
        <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pt-6 pb-4 sm:px-6 lg:px-8">
          <PageHeader
            className="pb-4"
            title="Meu Espaço"
            description="Suas anotações pessoais e materiais de estudo."
            action={
              <Select value={sessionId ?? GENERAL} onValueChange={selectSession}>
                <SelectTrigger className="w-full bg-chat-card sm:w-72" aria-label="Escolher aula">
                  <SelectValue>{session?.title ?? (sessionId ? "Carregando..." : "Anotações gerais")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>Anotações gerais</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Aulas</SelectLabel>
                    {sessions.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma aula cadastrada.</p>
                    )}
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            }
          />

          {session && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="h-4 w-4 text-primary" />
              <Link to={`/treino/${trainingId}/aula/${session.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{session.title}</Link>
              {session.scheduled_at && (
                <span>· {format(new Date(session.scheduled_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</span>
              )}
            </div>
          )}

          <ChatPanel
            key={sessionId ?? GENERAL}
            className="flex-1"
            messages={messages}
            currentUserId={user?.id}
            isLoading={isLoading}
            canPost={!isExpired}
            readOnlyNotice="Seu acesso expirou — suas notas estão em modo apenas leitura."
            placeholder={session ? `Anotação sobre "${session.title}"...` : "Escreva uma anotação..."}
            emptyState={{
              icon: BookOpen,
              title: session ? "Nenhuma anotação para esta aula" : "Nenhuma anotação ainda",
              description: session
                ? "Registre aqui o que aprendeu nesta aula."
                : "Comece a registrar suas anotações e materiais de estudo!",
            }}
            deleteDescription="Esta anotação será removida permanentemente. Esta ação não pode ser desfeita."
            deletedNotice="Anotação excluída"
            onUploadFile={uploadFile}
            onSend={async (content, attachments) => {
              try {
                await createPost.mutateAsync({ content, attachments, sessionId });
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
            canDeleteMessage={(_, isOwn) => isOwn && !isExpired}
            isSending={createPost.isPending}
            isSavingEdit={updatePost.isPending}
            isDeleting={deletePost.isPending}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default MeuEspaco;
