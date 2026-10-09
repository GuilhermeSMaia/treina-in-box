import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { AlertCircle, LucideIcon, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { cn } from "@/lib/utils";
import { ChatAttachments } from "./ChatAttachments";
import { ChatComposer } from "./ChatComposer";
import {
  ChatAttachment,
  ChatMessage,
  formatDayLabel,
  getInitials,
  groupMessages,
  htmlToText,
  textToHtml,
} from "./chat-utils";

export interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId?: string;
  isLoading?: boolean;
  /** Quando falso, o campo de envio é substituído por `readOnlyNotice`. */
  canPost?: boolean;
  readOnlyNotice?: ReactNode;
  placeholder?: string;
  emptyState?: { icon?: LucideIcon; title: string; description?: string };
  deleteDescription?: string;
  /** Recebe o conteúdo já convertido em HTML e os anexos já enviados. */
  onSend: (content: string, attachments: ChatAttachment[]) => Promise<boolean>;
  /** Se omitido, o envio de anexos fica desabilitado. */
  onUploadFile?: (file: File) => Promise<ChatAttachment>;
  onEdit?: (id: string, content: string, attachments: ChatAttachment[]) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  canEditMessage?: (message: ChatMessage, isOwn: boolean) => boolean;
  canDeleteMessage?: (message: ChatMessage, isOwn: boolean) => boolean;
  isSending?: boolean;
  isSavingEdit?: boolean;
  isDeleting?: boolean;
  className?: string;
}

export function ChatPanel({
  messages,
  currentUserId,
  isLoading = false,
  canPost = true,
  readOnlyNotice = "Você está em modo apenas leitura.",
  placeholder,
  emptyState = { title: "Nenhuma mensagem ainda" },
  deleteDescription = "Esta mensagem será removida permanentemente. Esta ação não pode ser desfeita.",
  onSend,
  onUploadFile,
  onEdit,
  onDelete,
  canEditMessage = (_, isOwn) => isOwn && canPost,
  canDeleteMessage = (_, isOwn) => isOwn,
  isSending = false,
  isSavingEdit = false,
  isDeleting = false,
  className,
}: ChatPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAttachments, setEditAttachments] = useState<ChatAttachment[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Rola para a mensagem mais recente ao abrir e quando chegam novas mensagens
  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledRef.current ? "smooth" : "auto" });
    hasScrolledRef.current = true;
  }, [isLoading, messages.length]);

  const handleSend = async (text: string, files: File[]): Promise<boolean> => {
    let attachments: ChatAttachment[] = [];
    if (files.length > 0 && onUploadFile) {
      setIsUploading(true);
      try {
        attachments = await Promise.all(files.map((f) => onUploadFile(f)));
      } catch {
        return false;
      } finally {
        setIsUploading(false);
      }
    }
    return onSend(textToHtml(text), attachments);
  };

  const startEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditText(htmlToText(message.content));
    setEditAttachments(message.attachments);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditAttachments([]);
  };

  const saveEdit = async () => {
    if (!onEdit || !editingId || (!editText.trim() && editAttachments.length === 0)) return;
    if (await onEdit(editingId, textToHtml(editText), editAttachments)) cancelEdit();
  };

  const handleDelete = async () => {
    if (!onDelete || !deleteTargetId) return;
    if (await onDelete(deleteTargetId)) setDeleteTargetId(null);
  };

  const groups = groupMessages(messages);
  const EmptyIcon = emptyState.icon ?? MessageSquare;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-chat-card shadow-sm",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-20 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-chat-bubble-own p-4">
              <EmptyIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-1 text-base font-medium text-foreground">{emptyState.title}</h2>
            {emptyState.description && (
              <p className="max-w-xs text-sm text-muted-foreground">{emptyState.description}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-4">
            {groups.map((group, groupIndex) => {
              const first = group[0];
              const prevGroup = groups[groupIndex - 1];
              const showDay =
                !prevGroup ||
                !isSameDay(new Date(prevGroup[0].created_at), new Date(first.created_at));
              const isOwn = currentUserId === first.user_id;
              const name = first.author?.name ?? "Usuário";

              return (
                <Fragment key={first.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-chat-page px-3 py-0.5">
                        {formatDayLabel(new Date(first.created_at))}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <MessageGroup>
                    {group.map((message, index) => {
                      const isFirst = index === 0;
                      const isLast = index === group.length - 1;
                      const canEdit = !!onEdit && canEditMessage(message, isOwn);
                      const canDelete = !!onDelete && canDeleteMessage(message, isOwn);
                      const isEditing = editingId === message.id;
                      const hasText = !!message.content && message.content !== "<p></p>";
                      const hasAttachments = message.attachments.length > 0;
                      const wasEdited =
                        new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 1000;
                      const actions = (canEdit || canDelete) && (
                        <MessageActions
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onEdit={() => startEdit(message)}
                          onDelete={() => setDeleteTargetId(message.id)}
                        />
                      );

                      return (
                        <Message key={message.id} align={isOwn ? "end" : "start"}>
                          {!isOwn && (
                            <MessageAvatar className={cn(!isLast && "invisible")}>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={message.author?.avatar_url ?? undefined} />
                                <AvatarFallback className="bg-chat-bubble text-xs text-muted-foreground">
                                  {getInitials(message.author?.name)}
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
                                <ChatAttachments
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
                                    disabled={(!editText.trim() && editAttachments.length === 0) || isSavingEdit}
                                  >
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex max-w-[85%] items-center gap-1 group-data-[align=end]/message:flex-row-reverse">
                                <div
                                  className={cn(
                                    "min-w-0 rounded-2xl border shadow-sm",
                                    hasAttachments ? "p-1.5" : "px-3.5 py-2",
                                    isOwn
                                      ? "border-chat-bubble-own-border bg-chat-bubble-own"
                                      : "border-chat-bubble-border bg-chat-bubble"
                                  )}
                                >
                                  {hasAttachments && <ChatAttachments attachments={message.attachments} />}
                                  {hasText && (
                                    <RichTextDisplay
                                      content={message.content}
                                      className={cn(
                                        "prose-p:my-0 prose-p:leading-relaxed prose-a:break-all prose-img:my-1 prose-img:rounded-lg",
                                        hasAttachments && "px-2 pb-0.5 pt-1.5"
                                      )}
                                    />
                                  )}
                                </div>
                                {actions}
                              </div>
                            )}

                            {isLast && !isEditing && (
                              <MessageFooter className="font-normal">
                                {format(new Date(message.created_at), "HH:mm")}
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

      <div className="border-t bg-chat-page/50 p-3">
        {canPost ? (
          <ChatComposer
            onSend={handleSend}
            isSending={isUploading || isSending}
            allowAttachments={!!onUploadFile}
            placeholder={placeholder}
          />
        ) : (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{readOnlyNotice}</AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
