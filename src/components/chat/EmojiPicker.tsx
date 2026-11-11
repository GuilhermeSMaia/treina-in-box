import { useMemo, useState } from "react";
import { Plus, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EMOJI_CATEGORIES, QUICK_REACTIONS, getRecentEmojis, rememberEmoji } from "./emoji-data";

/** Grade completa de emojis, com abas por categoria e "recentes". */
export function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  const recent = useMemo(() => getRecentEmojis(), []);
  const tabs = useMemo(
    () => [
      ...(recent.length > 0 ? [{ id: "recent", label: "Recentes", icon: "🕘", emojis: recent }] : []),
      ...EMOJI_CATEGORIES,
    ],
    [recent]
  );
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="w-[17.5rem] max-w-full">
      <div className="mb-2 flex gap-0.5 border-b pb-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            title={tab.label}
            aria-label={tab.label}
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-base transition-colors hover:bg-muted",
              tab.id === current.id && "bg-muted"
            )}
          >
            {tab.icon}
          </button>
        ))}
      </div>
      <p className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">{current.label}</p>
      <div className="grid max-h-48 grid-cols-7 gap-0.5 overflow-y-auto pr-1">
        {current.emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => {
              rememberEmoji(emoji);
              onPick(emoji);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Reações rápidas + botão "+" que abre a grade completa. */
export function ReactionPickerContent({ onPick }: { onPick: (emoji: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) return <EmojiGrid onPick={onPick} />;

  return (
    <div className="flex items-center gap-0.5">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125 hover:bg-muted"
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        aria-label="Mais emojis"
        title="Mais emojis"
        onClick={() => setExpanded(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Botão de carinha que abre a grade de emojis (usado no campo de mensagem). */
export function EmojiPickerButton({
  onPick,
  disabled,
  className,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Inserir emoji"
          title="Inserir emoji"
          className={cn("h-9 w-9 shrink-0 rounded-full text-muted-foreground", className)}
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-2">
        {/* key força a grade a recarregar os "recentes" a cada abertura */}
        {open && <EmojiGrid onPick={(emoji) => onPick(emoji)} />}
      </PopoverContent>
    </Popover>
  );
}
