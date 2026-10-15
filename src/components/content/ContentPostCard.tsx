import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, EyeOff, Paperclip, Pencil, Trash2, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { badgeVariants } from "@/components/ui/badge";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { FileAttachment } from "@/components/FileAttachment";
import { AttachmentPreview, hasPreview } from "@/components/AttachmentPreview";
import type { ContentPost } from "@/hooks/useContentPosts";
import { cn } from "@/lib/utils";
import { getFullName } from "@/lib/names";

interface ContentPostCardProps {
  post: ContentPost;
  /** Aula vinculada: exibida como etiqueta com link para a tela da aula. */
  session?: { id: string; title: string };
  trainingId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Substitui a exibição do conteúdo (ex.: formulário de edição). */
  children?: ReactNode;
}

/** Card de um conteúdo publicado, usado no Conteúdo e na tela da Aula. */
export function ContentPostCard({ post, session, trainingId, onEdit, onDelete, children }: ContentPostCardProps) {
  const hasActions = !!onEdit || !!onDelete;
  const hasText = !!post.content && post.content !== "<p></p>";
  const authorName = getFullName(post.profile, "Usuário");
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4 pb-3">
        {children ?? (
          <>
            {(session || hasActions) && (
              <div className="mb-1 flex items-center justify-between gap-2">
                {session && (
                  <Link
                    to={`/treino/${trainingId}/aula/${session.id}`}
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "gap-1 border-primary/30 font-normal hover:bg-primary/10"
                    )}
                  >
                    <Video className="h-3 w-3 text-primary" />
                    {session.title}
                  </Link>
                )}
                {hasActions && (
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={onEdit}
                        aria-label="Editar conteúdo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={onDelete}
                        aria-label="Excluir conteúdo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {hasText && <RichTextDisplay content={post.content} />}

            {post.attachment_url && post.attachment_name && (
              <Collapsible
                open={showPreview}
                onOpenChange={setShowPreview}
                className={cn("space-y-2", hasText && "mt-3 border-t pt-3")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Paperclip className="h-3 w-3" /> Anexo
                  </p>
                  {hasPreview(post.attachment_name) && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                        {showPreview ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                        {showPreview ? "Ocultar prévia" : "Ver prévia"}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                <CollapsibleContent>
                  <AttachmentPreview name={post.attachment_name} url={post.attachment_url} />
                </CollapsibleContent>
                <FileAttachment name={post.attachment_name} url={post.attachment_url} />
              </Collapsible>
            )}

            <p className="mt-3 border-t pt-2 text-right text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorName}</span>
              {" · "}
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
