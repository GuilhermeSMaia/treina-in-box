import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, FilePlus, FileText, MoreHorizontal, NotebookPen, Pencil, Trash2, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LiveSession } from "@/hooks/useLiveSessions";
import { cn } from "@/lib/utils";

type SessionVariant = "active" | "upcoming" | "past" | "other";

// Ícone indica o tipo: Video = aula ao vivo, FileText = aula só de conteúdo
const VARIANTS = {
  active: { icon: Video, label: "Aula ao vivo", card: "border-primary/30", iconBox: "rounded-xl bg-primary/10 p-3", iconClass: "h-5 w-5 text-primary", dateFormat: "dd MMM · HH:mm" },
  upcoming: { icon: Video, label: "Aula ao vivo", card: "", iconBox: "rounded-lg bg-primary/10 p-2.5", iconClass: "h-4 w-4 text-primary", dateFormat: "EEEE, dd 'de' MMMM · HH:mm" },
  past: { icon: Video, label: "Aula ao vivo (realizada)", card: "", iconBox: "rounded-lg bg-secondary p-2.5", iconClass: "h-4 w-4 text-muted-foreground", dateFormat: "'Realizada em' dd 'de' MMMM · HH:mm" },
  other: { icon: FileText, label: "Aula de conteúdo", card: "", iconBox: "rounded-lg bg-secondary p-2.5", iconClass: "h-4 w-4 text-muted-foreground", dateFormat: "" },
} as const;

interface SessionCardProps {
  session: LiveSession;
  trainingId?: string;
  variant: SessionVariant;
  onEdit?: (session: LiveSession) => void;
  onDelete?: (session: LiveSession) => void;
}

/** Card de uma aula do Ao Vivo (ao vivo, próxima ou postada). */
export function SessionCard({ session, trainingId, variant, onEdit, onDelete }: SessionCardProps) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  const isActive = variant === "active";
  const date =
    variant === "other"
      ? `Postada em ${format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
      : session.scheduled_at && format(new Date(session.scheduled_at), v.dateFormat, { locale: ptBR });

  return (
    <Card className={cn("border shadow-none", v.card)}>
      <CardContent className={cn("flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center", isActive ? "py-5" : "py-4")}>
        <div className="flex items-center gap-3">
          <div className={v.iconBox} title={v.label}>
            <Icon className={v.iconClass} aria-label={v.label} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/treino/${trainingId}/aula/${session.id}`}
                className={cn("font-medium text-foreground hover:text-primary hover:underline", !isActive && "text-sm")}
              >
                {session.title}
              </Link>
              {isActive && <Badge className="text-xs">Ao Vivo</Badge>}
            </div>
            {date && <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
            <Link to={`/treino/${trainingId}/meu-espaco?aula=${session.id}`} title="Minhas anotações desta aula">
              <NotebookPen className="mr-1.5 h-4 w-4" /> Anotar
            </Link>
          </Button>
          {session.meeting_url && (variant === "active" || variant === "other") && (
            <Button size="sm" variant={isActive ? "default" : "outline"} asChild>
              <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                Entrar <ExternalLink className="ml-1" />
              </a>
            </Button>
          )}
          {onEdit && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Ações da sessão">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/treino/${trainingId}/conteudo?aula=${session.id}`}>
                    <FilePlus className="mr-2 h-3.5 w-3.5" /> Adicionar conteúdo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(session)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(session)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
