import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import {
  AlertCircle,
  ArrowDown,
  Copy,
  CornerUpLeft,
  LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Smile,
  Trash2,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { getInitials } from "@/lib/names";
import { copyText } from "@/lib/clipboard";
import { notify } from "@/components/feedback/notify";
import { cn } from "@/lib/utils";
import { ChatAttachments } from "./ChatAttachments";
import { ChatComposer } from "./ChatComposer";
import { ReactionPickerContent } from "./EmojiPicker";
import {
  ChatAttachment,
  ChatMessage,
  ChatReaction,
  formatDayLabel,
  groupMessages,
  htmlToText,
  messageSnippet,
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
  /** Aviso exibido depois que uma mensagem é excluída. */
  deletedNotice?: string;
  /** Recebe o conteúdo já convertido em HTML, os anexos já enviados e a mensagem respondida (se houver). */
  onSend: (content: string, attachments: ChatAttachment[], replyToId?: string | null) => Promise<boolean>;
  /** Se omitido, o envio de anexos fica desabilitado. */
  onUploadFile?: (file: File) => Promise<ChatAttachment>;
  onEdit?: (id: string, content: string, attachments: ChatAttachment[]) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  canEditMessage?: (message: ChatMessage, isOwn: boolean) => boolean;
  canDeleteMessage?: (message: ChatMessage, isOwn: boolean) => boolean;
  /** Recursos estilo WhatsApp (todos opcionais, desligados por padrão). */
  allowReply?: boolean;
  allowReactions?: boolean;
  allowEmoji?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Quem pode fixar mensagens e a ação que persiste a mudança. */
  canPin?: boolean;
  onTogglePin?: (messageId: string, pinned: boolean) => Promise<boolean>;
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
  deletedNotice = "Mensagem excluída",
  onSend,
  onUploadFile,
  onEdit,
  onDelete,
  canEditMessage = (_, isOwn) => isOwn && canPost,
  canDeleteMessage = (_, isOwn) => isOwn,
  allowReply = false,
  allowReactions = false,
  allowEmoji = false,
  onToggleReaction,
  canPin = false,
  onTogglePin,
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();

  const reactionsEnabled = allowReactions && canPost && !!onToggleReaction;
  const replyEnabled = allowReply && canPost;
  const pinEnabled = canPin && !!onTogglePin;

  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const pinnedMessages = useMemo(
    () =>
      messages
        .filter((m) => !!m.pinned_at)
        .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime()),
    [messages]
  );

  // Rola para o fim ao abrir; depois, só se a pessoa já estava no fim ou enviou a mensagem
  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const stick = !hasScrolledRef.current || isNearBottomRef.current || last.user_id === currentUserId;
    if (stick) {
      bottomRef.current?.scrollIntoView({ behavior: hasScrolledRef.current ? "smooth" : "auto" });
    } else {
      setShowScrollDown(true);
    }
    hasScrolledRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages.length]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  // Se a mensagem que está sendo respondida for apagada, cancela a resposta
  useEffect(() => {
    if (replyingTo && !messagesById.has(replyingTo.id)) setReplyingTo(null);
  }, [messagesById, replyingTo]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    isNearBottomRef.current = near;
    setShowScrollDown(!near);
  };

  const jumpToMessage = (id: string) => {
    const el = scrollRef.current?.querySelector(`[data-message-id="${id}"]`);
    if (!el) {
      notify.error("Mensagem não encontrada", "Ela pode ter sido excluída.");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600);
  };

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
    const ok = await onSend(textToHtml(text), attachments, replyingTo?.id ?? null);
    if (ok) setReplyingTo(null);
    return ok;
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
    if (await onDelete(deleteTargetId)) {
      setDeleteTargetId(null);
      notify.deleted(deletedNotice);
    }
  };

  const handleCopy = async (message: ChatMessage) => {
    const ok = await copyText(htmlToText(message.content));
    if (ok) notify.success("Texto copiado");
    else notify.error("Não foi possível copiar");
  };

  const authorName = (message: ChatMessage) =>
    message.user_id === currentUserId ? "Você" : message.author?.name ?? "Usuário";

  const groups = groupMessages(messages);
  const currentPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedIndex % pinnedMessages.length] : null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-chat-card shadow-sm",
        className
      )}
    >
      {currentPinned && (
        <div className="flex items-center gap-2 border-b bg-chat-page/60 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              jumpToMessage(currentPinned.id);
              setPinnedIndex((i) => i + 1);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition-colors hover:bg-muted/60"
          >
            <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 border-l-2 border-primary/60 pl-2">
              <p className="text-[11px] font-semibold text-primary">
                Mensagem fixada
                {pinnedMessages.length > 1 && ` · ${(pinnedIndex % pinnedMessages.length) + 1} de ${pinnedMessages.length}`}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium">{authorName(currentPinned)}:</span> {messageSnippet(currentPinned, 90)}
              </p>
            </div>
          </button>
          {pinEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              aria-label="Desafixar mensagem"
              title="Desafixar"
              onClick={() => onTogglePin!(currentPinned.id, false)}
            >
              <PinOff className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-14 w-2/3" />
              <Skeleton className="ml-auto h-10 w-1/2" />
              <Skeleton className="h-20 w-3/5" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              card={false}
              icon={emptyState.icon ?? MessageSquare}
              title={emptyState.title}
              description={emptyState.description}
              className="h-full"
              iconBoxClassName="bg-chat-bubble-own"
            />
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
                        const replyTarget = message.reply_to_id ? messagesById.get(message.reply_to_id) : undefined;
                        const reactions = message.reactions ?? [];

                        return (
                          <Message key={message.id} data-message-id={message.id} align={isOwn ? "end" : "start"}>
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

                              {message.pinned_at && !isEditing && (
                                <span className="flex items-center gap-1 px-3 text-[11px] text-muted-foreground">
                                  <Pin className="h-3 w-3" /> Fixada
                                </span>
                              )}

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
                                      "min-w-0 rounded-2xl border shadow-sm transition-shadow duration-300",
                                      hasAttachments ? "p-1.5" : "px-3.5 py-2",
                                      isOwn
                                        ? "border-chat-bubble-own-border bg-chat-bubble-own"
                                        : "border-chat-bubble-border bg-chat-bubble",
                                      highlightId === message.id && "ring-2 ring-primary/60"
                                    )}
                                  >
                                    {message.reply_to_id && (
                                      <ReplyQuote
                                        name={replyTarget ? authorName(replyTarget) : ""}
                                        snippet={replyTarget ? messageSnippet(replyTarget) : ""}
                                        missing={!replyTarget}
                                        onClick={replyTarget ? () => jumpToMessage(replyTarget.id) : undefined}
                                        className={hasAttachments ? "m-0.5 mb-1.5" : "mb-1.5"}
                                      />
                                    )}
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
                                  <MessageToolbar
                                    hasText={hasText}
                                    canReact={reactionsEnabled}
                                    canReply={replyEnabled}
                                    canPin={pinEnabled}
                                    pinned={!!message.pinned_at}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    onReact={(emoji) => onToggleReaction?.(message.id, emoji)}
                                    onMoreReactions={() => setReactionPickerFor(message.id)}
                                    onReply={() => setReplyingTo(message)}
                                    onCopy={() => handleCopy(message)}
                                    onPin={() => onTogglePin?.(message.id, !message.pinned_at)}
                                    onEdit={() => startEdit(message)}
                                    onDelete={() => setDeleteTargetId(message.id)}
                                  />
                                </div>
                              )}

                              {reactions.length > 0 && !isEditing && (
                                <ReactionChips
                                  reactions={reactions}
                                  currentUserId={currentUserId}
                                  disabled={!reactionsEnabled}
                                  onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
                                />
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

        {showScrollDown && messages.length > 0 && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-3 right-4 h-9 w-9 rounded-full border shadow-md"
            aria-label="Ir para a mensagem mais recente"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="border-t bg-chat-page/50 p-3">
        {canPost ? (
          <ChatComposer
            onSend={handleSend}
            isSending={isUploading || isSending}
            allowAttachments={!!onUploadFile}
            allowEmoji={allowEmoji}
            placeholder={placeholder}
            replyTo={
              replyingTo
                ? { id: replyingTo.id, name: authorName(replyingTo), snippet: messageSnippet(replyingTo) }
                : null
            }
            onCancelReply={() => setReplyingTo(null)}
          />
        ) : (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{readOnlyNotice}</AlertDescription>
          </Alert>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={handleDelete}
        description={deleteDescription}
        isPending={isDeleting}
      />

      <Dialog open={!!reactionPickerFor} onOpenChange={(open) => !open && setReactionPickerFor(null)}>
        <DialogContent className="w-auto max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Reagir à mensagem</DialogTitle>
            <DialogDescription className="sr-only">Escolha um emoji para reagir.</DialogDescription>
          </DialogHeader>
          {reactionPickerFor && (
            <ReactionPickerContent
              onPick={(emoji) => {
                onToggleReaction?.(reactionPickerFor, emoji);
                setReactionPickerFor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Citação da mensagem respondida, dentro do balão. */
function ReplyQuote({
  name,
  snippet,
  missing,
  onClick,
  className,
}: {
  name: string;
  snippet: string;
  missing?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "block w-full min-w-[8rem] rounded-lg border-l-4 border-primary/60 bg-black/5 px-2.5 py-1.5 text-left dark:bg-white/5",
        onClick && "cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10",
        className
      )}
    >
      {missing ? (
        <span className="text-xs italic text-muted-foreground">Mensagem original indisponível</span>
      ) : (
        <>
          <span className="block truncate text-xs font-semibold text-primary">{name}</span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{snippet}</span>
        </>
      )}
    </button>
  );
}

function ReactionChips({
  reactions,
  currentUserId,
  disabled,
  onToggle,
}: {
  reactions: ChatReaction[];
  currentUserId?: string;
  disabled?: boolean;
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="relative z-10 -mt-2 flex flex-wrap gap-1 px-1.5 group-data-[align=end]/message:justify-end">
      {reactions.map((r) => {
        const mine = !!currentUserId && r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(r.emoji)}
            title={mine ? `Você${r.userIds.length > 1 ? ` e mais ${r.userIds.length - 1}` : ""} · clique para remover` : `${r.userIds.length} reação(ões)`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors",
              mine ? "border-primary/50 bg-primary/10" : "border-border bg-background hover:bg-muted",
              disabled && "cursor-default"
            )}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            {r.userIds.length > 1 && <span className="tabular-nums text-muted-foreground">{r.userIds.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface MessageToolbarProps {
  hasText: boolean;
  canReact: boolean;
  canReply: boolean;
  canPin: boolean;
  pinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onMoreReactions: () => void;
  onReply: () => void;
  onCopy: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Ações ao lado do balão: reagir e responder (desktop) + menu "⋯" completo. */
function MessageToolbar({
  hasText,
  canReact,
  canReply,
  canPin,
  pinned,
  canEdit,
  canDelete,
  onReact,
  onMoreReactions,
  onReply,
  onCopy,
  onPin,
  onEdit,
  onDelete,
}: MessageToolbarProps) {
  const [reactOpen, setReactOpen] = useState(false);
  const hasMenu = canReact || canReply || hasText || canPin || canEdit || canDelete;
  if (!hasMenu) return null;

  // Em telas sem hover (celular) os botões ficam sempre visíveis e os atalhos vão só para o menu
  const iconButton =
    "h-7 w-7 shrink-0 text-muted-foreground";

  return (
    <div className="flex shrink-0 items-center self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100">
      {canReact && (
        <Popover open={reactOpen} onOpenChange={setReactOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(iconButton, "[@media(hover:none)]:hidden")}
              aria-label="Reagir"
              title="Reagir"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto rounded-full p-1.5">
            {reactOpen && (
              <ReactionPickerContent
                onPick={(emoji) => {
                  onReact(emoji);
                  setReactOpen(false);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      )}
      {canReply && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(iconButton, "[@media(hover:none)]:hidden")}
          onClick={onReply}
          aria-label="Responder"
          title="Responder"
        >
          <CornerUpLeft className="h-4 w-4" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={iconButton} aria-label="Ações da mensagem">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canReply && (
            <DropdownMenuItem onClick={onReply}>
              <CornerUpLeft className="mr-2 h-3.5 w-3.5" /> Responder
            </DropdownMenuItem>
          )}
          {canReact && (
            <DropdownMenuItem onClick={onMoreReactions}>
              <Smile className="mr-2 h-3.5 w-3.5" /> Reagir
            </DropdownMenuItem>
          )}
          {hasText && (
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copiar texto
            </DropdownMenuItem>
          )}
          {canPin && (
            <DropdownMenuItem onClick={onPin}>
              {pinned ? (
                <>
                  <PinOff className="mr-2 h-3.5 w-3.5" /> Desafixar
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-3.5 w-3.5" /> Fixar
                </>
              )}
            </DropdownMenuItem>
          )}
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
    </div>
  );
}
