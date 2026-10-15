import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Bold, Heading2, Italic } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type TextFormat = "heading" | "bold" | "italic";

export interface FormattedTextareaProps {
  /** Conteúdo em HTML. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Campo de texto no visual do Textarea do shadcn, com título, negrito e itálico aplicados ao vivo. */
export function FormattedTextarea({ value, onChange, placeholder, className, disabled }: FormattedTextareaProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "rich-text-content prose prose-sm max-w-none min-h-[140px] px-3 py-2 text-sm focus:outline-none [&_h2]:mt-1",
      },
    },
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }): TextFormat[] => {
      if (!editor) return [];
      const formats: TextFormat[] = [];
      if (editor.isActive("heading", { level: 2 })) formats.push("heading");
      if (editor.isActive("bold")) formats.push("bold");
      if (editor.isActive("italic")) formats.push("italic");
      return formats;
    },
    equalityFn: (a, b) => a?.join() === b?.join(),
  }) ?? [];

  // Sincroniza mudanças externas (ex.: limpar após publicar, abrir edição)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const applyFormat = (format: TextFormat) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (format === "heading") chain.toggleHeading({ level: 2 }).run();
    else if (format === "bold") chain.toggleBold().run();
    else chain.toggleItalic().run();
  };

  const handleToolbarChange = (next: string[]) => {
    const changed = [
      ...next.filter((f) => !active.includes(f as TextFormat)),
      ...active.filter((f) => !next.includes(f)),
    ];
    if (changed[0]) applyFormat(changed[0] as TextFormat);
  };

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Evita que o clique na barra tire o foco (e a seleção) do texto */}
      <div className="border-b px-2 py-1.5" onMouseDown={(e) => e.preventDefault()}>
        <ToggleGroup
          type="multiple"
          size="sm"
          value={active}
          onValueChange={handleToolbarChange}
          className="justify-start"
          disabled={disabled}
        >
          <ToggleGroupItem value="heading" aria-label="Título" title="Título">
            <Heading2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="bold" aria-label="Negrito" title="Negrito (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Itálico" title="Itálico (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
