import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentGroup } from "@/components/ui/attachment";
import { FileAttachment } from "@/components/FileAttachment";
import { EmojiPickerButton } from "./EmojiPicker";
import { ACCEPTED_ATTR, ACCEPTED_MIME, MAX_FILES, MAX_FILE_SIZE, formatBytes } from "./chat-utils";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

export function ChatComposer({
  onSend,
  isSending,
  allowAttachments = true,
  placeholder = "Escreva uma mensagem...",
  allowEmoji = false,
  replyTo = null,
  onCancelReply,
}: {
  onSend: (text: string, files: File[]) => Promise<boolean>;
  isSending: boolean;
  allowAttachments?: boolean;
  placeholder?: string;
  allowEmoji?: boolean;
  /** Mensagem sendo respondida: mostra a faixa de citação acima do campo. */
  replyTo?: { id: string; name: string; snippet: string } | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (text.trim().length > 0 || pending.length > 0) && !isSending;

  const addFiles = (files: File[]) => {
    if (!allowAttachments) return;
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

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((t) => t.slice(0, start) + emoji + t.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // Ao escolher uma mensagem para responder, leva o cursor para o campo
  useEffect(() => {
    if (replyTo?.id) textareaRef.current?.focus();
  }, [replyTo?.id]);

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
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-primary/60 bg-muted/60 px-3 py-2">
          <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-primary">Respondendo a {replyTo.name}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{replyTo.snippet}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
            aria-label="Cancelar resposta"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {pending.length > 0 && (
        <AttachmentGroup className="px-1 pb-2">
          {pending.map((p) => (
            <FileAttachment
              key={p.id}
              name={p.file.name}
              type={p.file.type}
              size={p.file.size}
              previewUrl={p.previewUrl || undefined}
              isUploading={isSending}
              onRemove={() => removePending(p.id)}
              className="w-56"
            />
          ))}
        </AttachmentGroup>
      )}

      <div className="flex items-end gap-1">
        {allowAttachments && (
          <>
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
          </>
        )}
        {allowEmoji && <EmojiPickerButton onPick={insertEmoji} disabled={isSending} />}
        <Textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && replyTo) {
              onCancelReply?.();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (allowAttachments && files.length > 0) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          placeholder={placeholder}
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
