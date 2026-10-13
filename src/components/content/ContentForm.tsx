import { ReactNode, useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileAttachment } from "@/components/FileAttachment";
import { FormattedTextarea } from "@/components/FormattedTextarea";
import type { LiveSession } from "@/hooks/useLiveSessions";
import { cn } from "@/lib/utils";

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
  "image/svg+xml",
];
const NO_SESSION = "none";

export interface ContentFormValues {
  content: string;
  session_id: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
}

interface PendingAttachment {
  file: File;
  previewUrl: string;
}

interface ContentFormProps {
  sessions: LiveSession[];
  initial?: Partial<ContentFormValues>;
  placeholder?: string;
  submitLabel: string;
  isPending?: boolean;
  /** Envia o arquivo escolhido e devolve a URL pública. */
  onUploadFile: (file: File) => Promise<string>;
  /** Salva o conteúdo; retorna true em caso de sucesso. */
  onSubmit: (values: ContentFormValues) => Promise<boolean>;
  /** Exibe o botão Cancelar (modo edição). */
  onCancel?: () => void;
  /** Limpa o formulário depois de salvar (modo publicação). */
  resetOnSubmit?: boolean;
}

/** Formulário de conteúdo (aula, mensagem e anexo), usado para publicar e editar. */
export function ContentForm({
  sessions,
  initial,
  placeholder,
  submitLabel,
  isPending = false,
  onUploadFile,
  onSubmit,
  onCancel,
  resetOnSubmit = false,
}: ContentFormProps) {
  const initialContent = initial?.content === "<p></p>" ? "" : (initial?.content ?? "");
  const [content, setContent] = useState(initialContent);
  const [sessionId, setSessionId] = useState<string | null>(initial?.session_id ?? null);
  const [existing, setExisting] = useState(
    initial?.attachment_url && initial.attachment_name
      ? { url: initial.attachment_url, name: initial.attachment_name }
      : null
  );
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const clearPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const canSubmit = (!!content.trim() || !!pending || !!existing) && !isPending && !isUploading;

  const submit = async () => {
    if (!canSubmit) return;
    let attachment = existing;
    if (pending) {
      setIsUploading(true);
      try {
        attachment = { url: await onUploadFile(pending.file), name: pending.file.name };
      } catch {
        return;
      } finally {
        setIsUploading(false);
      }
    }
    const ok = await onSubmit({
      content,
      session_id: sessionId,
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
    });
    if (ok && resetOnSubmit) {
      clearPending();
      setContent("");
      setSessionId(null);
      setExisting(null);
    }
  };

  return (
    <div className="space-y-4">
      <FormSection label="Aula" hint="(opcional)">
        <Select value={sessionId ?? NO_SESSION} onValueChange={(v) => setSessionId(v === NO_SESSION ? null : v)}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SESSION}>Nenhuma aula</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>

      <FormSection label="Mensagem">
        <FormattedTextarea value={content} onChange={setContent} placeholder={placeholder} />
      </FormSection>

      <FormSection label="Anexo" hint="(opcional)">
        {existing && !pending ? (
          <FileAttachment name={existing.name} url={existing.url} onRemove={() => setExisting(null)} />
        ) : (
          <AttachmentPicker pending={pending} onSelect={setPending} onRemove={clearPending} isUploading={isUploading} />
        )}
      </FormSection>

      <div className="flex justify-end gap-2 border-t pt-3">
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
          </Button>
        )}
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {!onCancel && <Send className="mr-1.5 h-3.5 w-3.5" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function FormSection({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AttachmentPicker({
  pending,
  onSelect,
  onRemove,
  isUploading,
}: {
  pending: PendingAttachment | null;
  onSelect: (p: PendingAttachment) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = (file: File | undefined) => {
    setTypeError(null);
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) {
      setTypeError("Apenas imagens, PDF, Word e PowerPoint são permitidos.");
      return;
    }
    onSelect({ file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "" });
  };

  if (pending) {
    return (
      <FileAttachment
        name={pending.file.name}
        type={pending.file.type}
        size={pending.file.size}
        previewUrl={pending.previewUrl || undefined}
        isUploading={isUploading}
        onRemove={onRemove}
      />
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          selectFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          selectFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5",
          isDragging ? "border-primary bg-primary/5" : "bg-muted/40"
        )}
      >
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">Clique para anexar ou arraste um arquivo</span>
        <span className="text-[11px] text-muted-foreground">Imagem · PDF · Word · PowerPoint</span>
      </button>
      {typeError && <p className="text-xs text-destructive">{typeError}</p>}
    </div>
  );
}
