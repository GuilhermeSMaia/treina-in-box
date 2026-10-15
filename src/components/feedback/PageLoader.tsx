import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de carregamento em tela cheia, usado pelos guards de rota. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-64 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
