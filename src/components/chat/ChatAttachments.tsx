import { Download, File, FileText, Presentation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatAttachment, formatBytes, isImageAttachment } from "./chat-utils";

export function DocIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  if (/\.pdf$/i.test(name)) return <FileText className={cn(className, "text-red-500")} aria-hidden />;
  if (/\.docx?$/i.test(name)) return <FileText className={cn(className, "text-blue-600")} aria-hidden />;
  if (/\.pptx?$/i.test(name)) return <Presentation className={cn(className, "text-orange-500")} aria-hidden />;
  return <File className={cn(className, "text-muted-foreground")} aria-hidden />;
}

export function RemoveButton({ onClick, className }: { onClick: () => void; className?: string }) {
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

export function ChatAttachments({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[];
  onRemove?: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  const images = attachments.map((a, i) => ({ a, i })).filter(({ a }) => isImageAttachment(a));
  const docs = attachments.map((a, i) => ({ a, i })).filter(({ a }) => !isImageAttachment(a));

  return (
    <div className="flex flex-col gap-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map(({ a, i }) => (
            <div key={a.url} className="relative">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={a.url}
                  alt={a.name}
                  loading="lazy"
                  className={cn(
                    "rounded-xl object-cover",
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
            className="group/file flex w-64 max-w-full items-center gap-2.5 rounded-xl border bg-background/70 px-3 py-2 text-sm transition-colors hover:bg-background"
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
