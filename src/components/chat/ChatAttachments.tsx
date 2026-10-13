import { X } from "lucide-react";
import { FileAttachment } from "@/components/FileAttachment";
import { cn } from "@/lib/utils";
import { ChatAttachment, isImageAttachment } from "./chat-utils";

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
        <FileAttachment
          key={a.url}
          name={a.name}
          type={a.type}
          size={a.size}
          url={a.url}
          onRemove={onRemove && (() => onRemove(i))}
          className="w-64"
        />
      ))}
    </div>
  );
}
