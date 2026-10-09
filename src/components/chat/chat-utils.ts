import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  attachments: ChatAttachment[];
  created_at: string;
  updated_at: string;
  author?: {
    name: string | null;
    avatar_url: string | null;
  };
}

export const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
export const ACCEPTED_ATTR = ACCEPTED_MIME.join(",");
export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
// Mensagens do mesmo autor enviadas dentro deste intervalo são agrupadas
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function isImageAttachment(a: { type: string; name: string }): boolean {
  return a.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converte o texto digitado em HTML simples (parágrafos, quebras e links). */
export function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\n/g, "<br>");
      return `<p>${html}</p>`;
    })
    .join("");
}

/** Converte o HTML salvo de volta em texto para edição. */
export function htmlToText(html: string): string {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|blockquote)>\s*/gi, "\n\n")
    .replace(/<\/li>\s*/gi, "\n");
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function getInitials(name: string | null | undefined): string {
  return (name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function groupMessages(messages: ChatMessage[]): ChatMessage[][] {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    const lastGroup = groups[groups.length - 1];
    const last = lastGroup?.[lastGroup.length - 1];
    const sameGroup =
      last &&
      last.user_id === message.user_id &&
      isSameDay(new Date(last.created_at), new Date(message.created_at)) &&
      new Date(message.created_at).getTime() - new Date(last.created_at).getTime() < GROUP_WINDOW_MS;
    if (sameGroup) lastGroup.push(message);
    else groups.push([message]);
  }
  return groups;
}
