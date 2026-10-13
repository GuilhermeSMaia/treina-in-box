import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description?: ReactNode;
  /** Envolve em um Card (padrão). Use false dentro de áreas que já têm fundo próprio. */
  card?: boolean;
  size?: "default" | "sm";
  className?: string;
  iconBoxClassName?: string;
}

/** Mensagem de "nada por aqui ainda", com ícone, título e descrição. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  card = true,
  size = "default",
  className,
  iconBoxClassName,
}: EmptyStateProps) {
  const sm = size === "sm";
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center", sm ? "py-12" : "py-16", className)}>
      <div className={cn("rounded-xl bg-secondary", sm ? "mb-3 p-3" : "mb-4 p-4", iconBoxClassName)}>
        <Icon className={cn("text-primary", sm ? "h-6 w-6" : "h-8 w-8")} />
      </div>
      {title && <h2 className="mb-1 text-base font-medium text-foreground">{title}</h2>}
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
    </div>
  );

  if (!card) return content;
  return (
    <Card className="border shadow-none">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}
