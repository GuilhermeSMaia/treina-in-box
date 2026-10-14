import { Download, File, FileText, Image as ImageIcon, Loader2, Presentation, X } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { cn } from "@/lib/utils";

export type FileKind = "image" | "pdf" | "word" | "pptx" | "other";

export function getFileKind(name: string, type?: string): FileKind {
  if (type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "image";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.docx?$/i.test(name)) return "word";
  if (/\.pptx?$/i.test(name)) return "pptx";
  return "other";
}

const KIND_LABEL: Record<FileKind, string> = {
  image: "Imagem",
  pdf: "PDF",
  word: "Word",
  pptx: "PowerPoint",
  other: "Arquivo",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocIcon({ name, type, className }: { name: string; type?: string; className?: string }) {
  switch (getFileKind(name, type)) {
    case "image":
      return <ImageIcon className={cn("text-emerald-600", className)} aria-hidden />;
    case "pdf":
      return <FileText className={cn("text-red-500", className)} aria-hidden />;
    case "word":
      return <FileText className={cn("text-blue-600", className)} aria-hidden />;
    case "pptx":
      return <Presentation className={cn("text-orange-500", className)} aria-hidden />;
    default:
      return <File className={cn("text-muted-foreground", className)} aria-hidden />;
  }
}

export interface FileAttachmentProps {
  name: string;
  /** MIME type, quando conhecido (ajuda a identificar imagens). */
  type?: string;
  size?: number;
  /** URL do arquivo publicado: o cartão vira link de download. */
  url?: string;
  /** URL para miniatura (imagem publicada ou object URL de um arquivo local). */
  previewUrl?: string;
  isUploading?: boolean;
  onRemove?: () => void;
  className?: string;
}

/** Arquivo anexado, no padrão do componente Attachment do shadcn. */
export function FileAttachment({
  name,
  type,
  size,
  url,
  previewUrl,
  isUploading = false,
  onRemove,
  className,
}: FileAttachmentProps) {
  const kind = getFileKind(name, type);
  const thumbnail = previewUrl ?? (kind === "image" ? url : undefined);
  const description = isUploading
    ? "Enviando…"
    : [KIND_LABEL[kind], size ? formatBytes(size) : null].filter(Boolean).join(" · ");

  return (
    <Attachment state={isUploading ? "uploading" : "done"} className={cn("w-72", className)}>
      <AttachmentMedia variant={thumbnail ? "image" : "icon"}>
        {isUploading ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : thumbnail ? (
          <img src={thumbnail} alt={name} loading="lazy" />
        ) : (
          <DocIcon name={name} type={type} />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={name}>{name}</AttachmentTitle>
        <AttachmentDescription>{description}</AttachmentDescription>
      </AttachmentContent>
      {url && !isUploading && (
        <AttachmentTrigger asChild aria-label={`Abrir ${name}`}>
          <a href={url} target="_blank" rel="noopener noreferrer" download={name} />
        </AttachmentTrigger>
      )}
      {(url || onRemove) && !isUploading && (
        <AttachmentActions>
          {url && (
            <AttachmentAction asChild aria-label={`Baixar ${name}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" download={name}>
                <Download />
              </a>
            </AttachmentAction>
          )}
          {onRemove && (
            <AttachmentAction
              onClick={onRemove}
              aria-label={`Remover ${name}`}
              className="hover:text-destructive"
            >
              <X />
            </AttachmentAction>
          )}
        </AttachmentActions>
      )}
    </Attachment>
  );
}
