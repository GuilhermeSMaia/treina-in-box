import { ReactNode } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTrainings } from "@/hooks/useTrainings";
import { useLiveSessions } from "@/hooks/useLiveSessions";

const sectionLabels: Record<string, string> = {
  aulas: "Aulas",
  conteudo: "Conteúdo",
  praca: "Praça",
  "meu-espaco": "Meu Espaço",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { trainingId, sessionId } = useParams();
  const location = useLocation();
  const { data: trainings } = useTrainings();
  const { data: sessions } = useLiveSessions(sessionId ? trainingId : undefined);

  const training = trainings?.find((t) => t.id === trainingId);
  const basePath = `/treino/${trainingId}`;
  // Segmento logo após /treino/:id (ex.: "aulas", "conteudo", "aula")
  const segment = location.pathname.split("/").filter(Boolean)[2] ?? "";
  // Em /treino/:id/aula/:sessionId a seção é "Aulas" e a aula vira o último item
  const isSessionPage = segment === "aula" && !!sessionId;
  const sectionKey = isSessionPage ? "aulas" : segment;
  const sectionLabel = sectionLabels[sectionKey];
  const sessionTitle = isSessionPage
    ? sessions?.find((s) => s.id === sessionId)?.title ?? "Aula"
    : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b px-4 bg-background gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/lobby" className="text-muted-foreground text-sm">
                      Lobby
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {training && sectionLabel && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to={`${basePath}/aulas`}
                          className="text-muted-foreground text-sm"
                        >
                          {training.title}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {sessionTitle ? (
                        <BreadcrumbLink asChild>
                          <Link
                            to={`${basePath}/${sectionKey}`}
                            className="text-muted-foreground text-sm"
                          >
                            {sectionLabel}
                          </Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-sm">
                          {sectionLabel}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {sessionTitle && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage className="text-sm truncate max-w-[16rem]">
                            {sessionTitle}
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    )}
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
