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

const sectionLabels: Record<string, string> = {
  "ao-vivo": "Ao Vivo",
  conteudo: "Conteúdo",
  praca: "Praça",
  "meu-espaco": "Meu Espaço",
  aula: "Aula",
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { trainingId } = useParams();
  const location = useLocation();
  const { data: trainings } = useTrainings();

  const training = trainings?.find((t) => t.id === trainingId);
  const segments = location.pathname.split("/");
  // Em /treino/:id/aula/:sessionId o último segmento é o id da aula
  const segment = segments.at(-2) === "aula" ? "aula" : segments.at(-1) ?? "";
  const sectionLabel = sectionLabels[segment];

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
                          to={`/treino/${trainingId}/conteudo`}
                          className="text-muted-foreground text-sm"
                        >
                          {training.title}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-sm">
                        {sectionLabel}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
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
