import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Conteúdo à direita do título (ex.: botão ou seletor). */
  action?: ReactNode;
  className?: string;
}

/** Título e subtítulo padrão das páginas internas. */
export function PageHeader({ title, description, icon: Icon, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
