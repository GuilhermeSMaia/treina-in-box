import { ReactNode } from "react";
import { ShieldX } from "lucide-react";

/** Tela cheia de "Acesso não autorizado", com uma ação (ex.: voltar ou sair). */
export function AccessDenied({ description, action }: { description: string; action: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <ShieldX className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-semibold text-foreground">Acesso não autorizado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
