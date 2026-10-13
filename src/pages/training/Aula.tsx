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
import { useLiveSessions } from "@/hooks/useLiveSessions";
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
      <Link to={`${basePath}/ao-vivo`}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Ao Vivo
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
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">Aula não encontrada</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Esta aula pode ter sido removida.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const status = session.is_active
    ? { label: "Ao vivo agora", variant: "default" as const }
    : session.scheduled_at && new Date(session.scheduled_at) > new Date()
      ? { label: "Agendada", variant: "secondary" as const }
      : session.scheduled_at
        ? { label: "Realizada", variant: "outline" as const }
        : { label: "Sem data", variant: "outline" as const };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        {backLink}

        {/* ── Informações da aula ── */}
        <Card className={session.is_active ? "border-primary/30 border shadow-none" : "border shadow-none"}>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 shrink-0">
                <Video className="h-5 w-5 text-primary" />
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

        {/* ── Conteúdos da aula ── */}
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
            <Card className="border shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-xl bg-secondary p-3 mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Nenhum conteúdo vinculado a esta aula ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            contents.map((post) => <ContentPostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Aula;
