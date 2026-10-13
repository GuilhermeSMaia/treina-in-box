import { Badge, BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
export type BadgeMap = Record<string, { label: string; variant: BadgeVariant }>;

export const ROLE_BADGES: BadgeMap = {
  owner: { label: "Proprietário", variant: "default" },
  admin: { label: "Admin", variant: "secondary" },
  mentor: { label: "Mentor", variant: "outline" },
  student: { label: "Aluno", variant: "outline" },
};

export const ENROLLMENT_STATUS_BADGES: BadgeMap = {
  active: { label: "Ativo", variant: "default" },
  blocked: { label: "Bloqueado", variant: "destructive" },
  expired: { label: "Expirado", variant: "outline" },
};

export const INVITATION_STATUS_BADGES: BadgeMap = {
  pending: { label: "Pendente", variant: "secondary" },
  accepted: { label: "Aceito", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

/** Badge com rótulo e cor definidos por um mapa (role, status etc.). */
export function StatusBadge({
  value,
  map,
  fallback = "—",
  className,
}: {
  value: string | null | undefined;
  map: BadgeMap;
  fallback?: string;
  className?: string;
}) {
  const item = value ? (map[value] ?? { label: value, variant: "outline" as const }) : { label: fallback, variant: "outline" as const };
  return (
    <Badge variant={item.variant} className={className}>
      {item.label}
    </Badge>
  );
}
