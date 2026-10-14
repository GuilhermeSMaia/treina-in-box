import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, ExternalLink, FileText, NotebookPen, Plus, Video } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentPostCard } from "@/components/content/ContentPostCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLiveSessions, getSessionStatus } from "@/hooks/useLiveSessions";
import { useContentPosts } from "@/hooks/useContentPosts";
import { useUserRole } from "@/hooks/useUserRole";

const Aula = () => {
  const { trainingId, sessionId } = useParams();
  const { data: sessions = [], isLoading: isLoadingSession } = useLiveSessions(trainingId);
  const { posts, isLoading: isLoadingPosts } = useContentPosts(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canPublish = isAdminOrOwner || isMentor;

  const session = sessions.find((s) => s.id === sessionId);
  const contents = posts.filter((p) => p.session_id === sessionId);
  const basePath = `/treino/${trainingId}`;

  const backLink = (
    <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
      <Link to={`${basePath}/aulas`}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Aulas
      </Link>
    </Button>
  );

  if (isLoadingSession) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          {backLink}
          <EmptyState icon={Video} title="Aula não encontrada" description="Esta aula pode ter sido removida." />
        </div>
      </AppLayout>
    );
  }

  const status = {
    content: { label: "Aula de conteúdo", variant: "outline" as const },
    upcoming: { label: "Agendada", variant: "secondary" as const },
    live: { label: "Ao vivo agora", variant: "default" as const },
    past: { label: "Realizada", variant: "outline" as const },
  }[getSessionStatus(session)];
  const TypeIcon = session.is_active ? Video : FileText;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {backLink}

        {/* ── Informações da aula ── */}
        <Card className={session.is_active ? "border-primary/30 border shadow-none" : "border shadow-none"}>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className={session.is_active ? "rounded-xl bg-primary/10 p-3 shrink-0" : "rounded-xl bg-secondary p-3 shrink-0"}>
                <TypeIcon className={session.is_active ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-foreground">{session.title}</h1>
                  <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {session.scheduled_at
                    ? format(new Date(session.scheduled_at), "EEEE, dd 'de' MMMM 'de' yyyy · HH:mm", { locale: ptBR })
                    : "Sem data agendada"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {session.meeting_url && (
                <Button size="sm" variant={session.is_active ? "default" : "outline"} asChild>
                  <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                    Entrar na reunião <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to={`${basePath}/meu-espaco?aula=${session.id}`}>
                  <NotebookPen className="mr-1.5 h-4 w-4" /> Minhas anotações
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Conteúdos da aula{contents.length > 0 && ` (${contents.length})`}
            </h2>
            {canPublish && (
              <Button size="sm" variant="ghost" asChild>
                <Link to={`${basePath}/conteudo?aula=${session.id}`}>
                  <Plus className="mr-1.5 h-4 w-4" /> Publicar conteúdo
                </Link>
              </Button>
            )}
          </div>

          {isLoadingPosts ? (
            <Skeleton className="h-24 w-full" />
          ) : contents.length === 0 ? (
            <EmptyState icon={FileText} size="sm" description="Nenhum conteúdo vinculado a esta aula ainda." />
          ) : (
            contents.map((post) => <ContentPostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Aula;
