import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Send,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  Paperclip,
  Download,
  File,
  FileText,
  Presentation,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlazaPosts, PlazaPost, PlazaAttachment } from "@/hooks/usePlazaPosts";
import { useUserRole } from "@/hooks/useUserRole";
import { useEnrollmentStatus } from "@/hooks/useEnrollmentStatus";
import { useAuth } from "@/contexts/AuthContext";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const ACCEPTED_ATTR = ACCEPTED_MIME.join(",");
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
// Mensagens do mesmo autor enviadas dentro deste intervalo são agrupadas
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isImageAttachment(a: { type: string; name: string }): boolean {
  return a.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converte o texto digitado em HTML simples (parágrafos, quebras e links). */
function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("");
}

/** Converte o HTML salvo de volta em texto para edição. */
function htmlToText(html: string): string {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|blockquote)>\s*/gi, "\n\n")
    .replace(/<\/li>\s*/gi, "\n");
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function getInitials(name: string | null | undefined): string {
  return (name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Agrupa mensagens consecutivas do mesmo autor (e do mesmo dia). */
function groupPosts(posts: PlazaPost[]): PlazaPost[][] {
  const groups: PlazaPost[][] = [];
  for (const post of posts) {
    const lastGroup = groups[groups.length - 1];
    const last = lastGroup?.[lastGroup.length - 1];
    const sameGroup =
      last &&
      last.user_id === post.user_id &&
      isSameDay(new Date(last.created_at), new Date(post.created_at)) &&
      new Date(post.created_at).getTime() - new Date(last.created_at).getTime() < GROUP_WINDOW_MS;
    if (sameGroup) lastGroup.push(post);
    else groups.push([post]);
  }
  return groups;
}

// ─── DocIcon ──────────────────────────────────────────────────────────────────

function DocIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  if (/\.pdf$/i.test(name)) return <FileText className={cn(className, "text-red-500")} aria-hidden />;
  if (/\.docx?$/i.test(name)) return <FileText className={cn(className, "text-blue-600")} aria-hidden />;
  if (/\.pptx?$/i.test(name)) return <Presentation className={cn(className, "text-orange-500")} aria-hidden />;
  return <File className={cn(className, "text-muted-foreground")} aria-hidden />;
}

// ─── MessageAttachments ───────────────────────────────────────────────────────

function MessageAttachments({
  attachments,
  onRemove,
}: {
  attachments: PlazaAttachment[];
  onRemove?: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  const images = attachments.map((a, i) => ({ a, i })).filter(({ a }) => isImageAttachment(a));
  const docs = attachments.map((a, i) => ({ a, i })).filter(({ a }) => !isImageAttachment(a));

  return (
    <div className="flex max-w-[85%] flex-col gap-1.5 group-data-[align=end]/message:items-end">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 group-data-[align=end]/message:justify-end">
          {images.map(({ a, i }) => (
            <div key={a.url} className="relative">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={a.url}
                  alt={a.name}
                  loading="lazy"
                  className={cn(
                    "rounded-xl border object-cover",
                    images.length === 1 ? "max-h-64 max-w-full" : "h-32 w-32"
                  )}
                />
              </a>
              {onRemove && (
                <RemoveButton onClick={() => onRemove(i)} className="absolute -right-1.5 -top-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
      {docs.map(({ a, i }) => (
        <div key={a.url} className="flex items-center gap-1">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            download={a.name}
            className="group/file flex w-64 max-w-full items-center gap-2.5 rounded-xl border bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/60"
          >
            <DocIcon name={a.name} className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{a.name}</p>
              {a.size > 0 && <p className="text-[11px] text-muted-foreground">{formatBytes(a.size)}</p>}
            </div>
            <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover/file:text-primary" />
          </a>
          {onRemove && <RemoveButton onClick={() => onRemove(i)} />}
        </div>
      ))}
    </div>
  );
}

function RemoveButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border bg-background p-0.5 text-muted-foreground transition-colors hover:text-destructive",
        className
      )}
      aria-label="Remover anexo"
    >
      <X className="h-3 w-3" />
    </button>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string; // object URL para imagens; vazio para documentos
}

function Composer({
  onSend,
  isSending,
}: {
  onSend: (text: string, files: File[]) => Promise<boolean>;
  isSending: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (text.trim().length > 0 || pending.length > 0) && !isSending;

  const addFiles = (files: File[]) => {
    const valid: PendingFile[] = [];
    for (const file of files) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        toast.error(`"${file.name}": apenas imagens, PDF, Word e PowerPoint são permitidos.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede o limite de ${formatBytes(MAX_FILE_SIZE)}.`);
        continue;
      }
      valid.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      });
    }
    setPending((prev) => {
      const room = MAX_FILES - prev.length;
      if (valid.length > room) {
        toast.error(`Você pode anexar até ${MAX_FILES} arquivos por mensagem.`);
        valid.slice(room).forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      }
      return [...prev, ...valid.slice(0, Math.max(room, 0))];
    });
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const submit = async () => {
    if (!canSend) return;
    const ok = await onSend(text, pending.map((p) => p.file));
    if (ok) {
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      setText("");
      textareaRef.current?.focus();
    }
  };

  // Auto-ajusta a altura do textarea conforme o conteúdo
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  return (
    <div
      className="rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2">
          {pending.map((p) =>
            p.previewUrl ? (
              <div key={p.id} className="relative">
                <img
                  src={p.previewUrl}
                  alt={p.file.name}
                  className="h-16 w-16 rounded-lg border object-cover"
                />
                <RemoveButton onClick={() => removePending(p.id)} className="absolute -right-1.5 -top-1.5" />
              </div>
            ) : (
              <div
                key={p.id}
                className="flex h-16 max-w-[14rem] items-center gap-2 rounded-lg border bg-secondary/40 px-3 text-xs"
              >
                <DocIcon name={p.file.name} className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.file.name}</p>
                  <p className="text-muted-foreground">{formatBytes(p.file.size)}</p>
                </div>
                <RemoveButton onClick={() => removePending(p.id)} />
              </div>
            )
          )}
        </div>
      )}

      <div className="flex items-end gap-1">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTR}
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          disabled={isSending || pending.length >= MAX_FILES}
          aria-label="Anexar arquivo"
          title="Anexar imagem, PDF, Word ou PowerPoint"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          placeholder="Escreva uma mensagem para a turma..."
          className="min-h-[36px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={submit}
          disabled={!canSend}
          aria-label="Enviar mensagem"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Praca = () => {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const { posts, isLoading, createPost, updatePost, deletePost, uploadFile } = usePlazaPosts(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const { isExpired } = useEnrollmentStatus();
  const canModerate = isAdminOrOwner || isMentor;
  const canPost = !isExpired;

  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAttachments, setEditAttachments] = useState<PlazaAttachment[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Rola para a mensagem mais recente ao abrir e quando chegam novas mensagens
  useEffect(() => {
    if (isLoading || posts.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledRef.current ? "smooth" : "auto" });
    hasScrolledRef.current = true;
  }, [isLoading, posts.length]);

  const handleSend = async (text: string, files: File[]): Promise<boolean> => {
    let attachments: PlazaAttachment[] = [];
    if (files.length > 0) {
      setIsUploading(true);
      try {
        attachments = await Promise.all(files.map((f) => uploadFile(f)));
      } catch {
        return false;
      } finally {
        setIsUploading(false);
      }
    }
    try {
      await createPost.mutateAsync({ content: textToHtml(text), attachments });
      return true;
    } catch {
      return false;
    }
  };

  const startEdit = (post: PlazaPost) => {
    setEditingId(post.id);
    setEditText(htmlToText(post.content));
    setEditAttachments(post.attachments);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditAttachments([]);
  };

  const saveEdit = () => {
    if (!editingId || (!editText.trim() && editAttachments.length === 0)) return;
    updatePost.mutate(
      { id: editingId, content: textToHtml(editText), attachments: editAttachments },
      { onSuccess: cancelEdit }
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deletePost.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
  };

  const groups = groupPosts(posts);

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100vh-2.75rem)] max-w-3xl flex-col">
        <div className="px-6 pt-6 pb-4 lg:px-8">
          <h1 className="text-xl font-semibold text-foreground">Praça</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Espaço de interação e troca entre participantes.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-14 w-2/3" />
              <Skeleton className="ml-auto h-10 w-1/2" />
              <Skeleton className="h-20 w-3/5" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-xl bg-secondary p-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-1 text-base font-medium text-foreground">Nenhuma mensagem ainda</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                Seja o primeiro a compartilhar algo com a turma!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-4">
              {groups.map((group, groupIndex) => {
                const first = group[0];
                const prevGroup = groups[groupIndex - 1];
                const showDay =
                  !prevGroup ||
                  !isSameDay(new Date(prevGroup[0].created_at), new Date(first.created_at));
                const isOwn = user?.id === first.user_id;
                const name = first.profile?.username ?? "Usuário";

                return (
                  <Fragment key={first.id}>
                    {showDay && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="h-px flex-1 bg-border" />
                        {formatDayLabel(new Date(first.created_at))}
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}

                    <MessageGroup>
                      {group.map((post, index) => {
                        const isFirst = index === 0;
                        const isLast = index === group.length - 1;
                        const canEditPost = (isOwn && !isExpired) || canModerate;
                        const canDeletePost = isOwn || canModerate;
                        const isEditing = editingId === post.id;
                        const hasText = !!post.content && post.content !== "<p></p>";
                        const wasEdited =
                          new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000;

                        return (
                          <Message key={post.id} align={isOwn ? "end" : "start"}>
                            {!isOwn && (
                              <MessageAvatar className={cn(!isLast && "invisible")}>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                                  <AvatarFallback className="bg-secondary text-xs text-muted-foreground">
                                    {getInitials(post.profile?.username)}
                                  </AvatarFallback>
                                </Avatar>
                              </MessageAvatar>
                            )}

                            <MessageContent className="gap-1.5">
                              {isFirst && !isOwn && <MessageHeader>{name}</MessageHeader>}

                              {isEditing ? (
                                <div className="w-full max-w-[85%] space-y-2 rounded-2xl border bg-background p-2">
                                  <Textarea
                                    autoFocus
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") cancelEdit();
                                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        saveEdit();
                                      }
                                    }}
                                    className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                  <MessageAttachments
                                    attachments={editAttachments}
                                    onRemove={(i) =>
                                      setEditAttachments((prev) => prev.filter((_, idx) => idx !== i))
                                    }
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                      Cancelar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={saveEdit}
                                      disabled={
                                        (!editText.trim() && editAttachments.length === 0) ||
                                        updatePost.isPending
                                      }
                                    >
                                      Salvar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {hasText && (
                                    <div className="flex max-w-[85%] items-center gap-1 group-data-[align=end]/message:flex-row-reverse">
                                      <div
                                        className={cn(
                                          "min-w-0 rounded-2xl px-3.5 py-2",
                                          isOwn ? "bg-primary/10" : "bg-muted"
                                        )}
                                      >
                                        <RichTextDisplay
                                          content={post.content}
                                          className="prose-p:my-0 prose-p:leading-relaxed prose-a:break-all prose-img:my-1 prose-img:rounded-lg"
                                        />
                                      </div>
                                      {(canEditPost || canDeletePost) && (
                                        <MessageActions
                                          canEdit={canEditPost}
                                          canDelete={canDeletePost}
                                          onEdit={() => startEdit(post)}
                                          onDelete={() => setDeleteTargetId(post.id)}
                                        />
                                      )}
                                    </div>
                                  )}

                                  {post.attachments.length > 0 && (
                                    <div className="flex w-full items-center gap-1 group-data-[align=end]/message:flex-row-reverse">
                                      <MessageAttachments attachments={post.attachments} />
                                      {!hasText && (canEditPost || canDeletePost) && (
                                        <MessageActions
                                          canEdit={canEditPost}
                                          canDelete={canDeletePost}
                                          onEdit={() => startEdit(post)}
                                          onDelete={() => setDeleteTargetId(post.id)}
                                        />
                                      )}
                                    </div>
                                  )}
                                </>
                              )}

                              {isLast && !isEditing && (
                                <MessageFooter className="font-normal">
                                  {format(new Date(post.created_at), "HH:mm")}
                                  {wasEdited && " · editada"}
                                </MessageFooter>
                              )}
                            </MessageContent>
                          </Message>
                        );
                      })}
                    </MessageGroup>
                  </Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="px-6 pt-2 pb-6 lg:px-8">
          {canPost ? (
            <Composer onSend={handleSend} isSending={isUploading || createPost.isPending} />
          ) : (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Seu acesso expirou — você está em modo apenas leitura.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta mensagem será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePost.isPending}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

function MessageActions({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/message:opacity-100 data-[state=open]:opacity-100"
          aria-label="Ações da mensagem"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Praca;
