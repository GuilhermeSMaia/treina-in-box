import { getFileKind } from "@/components/FileAttachment";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  name: string;
  /** URL pública do arquivo. */
  url: string;
  className?: string;
}

// Word e PowerPoint não abrem no navegador: o visualizador do Office renderiza a partir da URL pública
const officeViewerUrl = (url: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

/** Indica se o tipo do arquivo tem prévia. */
export const hasPreview = (name: string) => getFileKind(name) !== "other";

/** Prévia do anexo publicado: imagem, PDF ou documento do Office. Outros tipos não exibem nada. */
export function AttachmentPreview({ name, url, className }: AttachmentPreviewProps) {
  const kind = getFileKind(name);
  const frame = cn("h-[480px] w-full rounded-lg border bg-muted/40", className);

  switch (kind) {
    case "image":
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={name}
            loading="lazy"
            className={cn("max-h-[480px] w-full rounded-lg border bg-muted/40 object-contain", className)}
          />
        </a>
      );
    case "pdf":
      return <iframe src={url} title={name} className={frame} loading="lazy" />;
    case "word":
    case "pptx":
      return <iframe src={officeViewerUrl(url)} title={name} className={frame} loading="lazy" />;
    default:
      return null;
  }
}
