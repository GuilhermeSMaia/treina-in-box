import { ReactNode, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Trash2,
  Send,
  Pencil,
  X,
  Paperclip,
  Download,
  Presentation,
  File,
  Video,
} from "lucide-react";
import { useContentPosts, ContentPost } from "@/hooks/useContentPosts";
import { useLiveSessions, LiveSession } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";
import { FormattedTextarea } from "@/components/FormattedTextarea";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME = [
  // documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ACCEPTED_ATTR = ACCEPTED_MIME.join(",");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

function getDocKind(name: string): "pdf" | "word" | "pptx" | "other" {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.docx?$/i.test(name)) return "word";
  if (/\.pptx?$/i.test(name)) return "pptx";
  return "other";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── DocIcon ──────────────────────────────────────────────────────────────────

function DocIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const kind = getDocKind(name);
  if (kind === "pdf")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
        className={`${className} text-red-500`} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  if (kind === "word")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
        className={`${className} text-blue-600`} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  if (kind === "pptx")
    return <Presentation className={`${className} text-orange-500`} aria-hidden />;
  return <File className={`${className} text-muted-foreground`} aria-hidden />;
}

const KIND_BADGE: Record<string, string> = {
  pdf: "bg-red-50 text-red-600 border-red-200",
  word: "bg-blue-50 text-blue-600 border-blue-200",
  pptx: "bg-orange-50 text-orange-600 border-orange-200",
};
const KIND_LABEL: Record<string, string> = { pdf: "PDF", word: "Word", pptx: "PowerPoint" };

// ─── AttachmentPreview ────────────────────────────────────────────────────────
// Shown inside a published post

function AttachmentPreview({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  if (isImage(name)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-3">
        <img
          src={url}
          alt={name}
          className="max-h-72 w-auto rounded-lg border object-cover"
        />
      </a>
    );
  }

  const kind = getDocKind(name);
  const badgeClass = KIND_BADGE[kind] ?? "bg-secondary text-muted-foreground border-border";
  const label = KIND_LABEL[kind] ?? "Arquivo";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className="mt-3 flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2.5 text-sm hover:bg-secondary/70 transition-colors group max-w-sm"
    >
      <DocIcon name={name} className="h-5 w-5 shrink-0" />
      <span className="truncate flex-1 min-w-0 font-medium text-foreground">{name}</span>
      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none shrink-0 ${badgeClass}`}>
        {label}
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  );
}

// ─── AttachmentPickerField ────────────────────────────────────────────────────
// Used in composer and edit form — holds a single pending attachment

interface PendingAttachment {
  file: File;
  previewUrl: string; // object URL for images; empty for docs
}

function AttachmentPickerField({
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
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    onSelect({ file, previewUrl });
  };

  return (
    <div className="space-y-2">
      {/* Preview of selected file */}
      {pending && (
        <div className="relative inline-flex">
          {pending.previewUrl ? (
            <div className="relative">
              <img
                src={pending.previewUrl}
                alt={pending.file.name}
                className="max-h-40 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={onRemove}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-background border p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-xs max-w-xs">
              <DocIcon name={pending.file.name} className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 min-w-0 font-medium">{pending.file.name}</span>
              <span className="text-muted-foreground shrink-0">{formatBytes(pending.file.size)}</span>
              <button
                type="button"
                onClick={onRemove}
                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drop zone — hidden when a file is already selected */}
      {!pending && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_ATTR}
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
            disabled={isUploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60",
              isDragging ? "border-primary bg-primary/5" : "bg-muted/40"
            )}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {isUploading ? "Enviando…" : "Clique para anexar ou arraste um arquivo"}
            </span>
            <span className="text-[11px] text-muted-foreground">Imagem · PDF · Word · PowerPoint</span>
          </button>
        </>
      )}

      {typeError && <p className="text-xs text-destructive">{typeError}</p>}
    </div>
  );
}

// ─── FormSection ──────────────────────────────────────────────────────────────

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

// ─── SessionSelect ────────────────────────────────────────────────────────────

const NO_SESSION = "none";

function SessionSelect({
  sessions,
  value,
  onChange,
}: {
  sessions: LiveSession[];
  value: string | null;
  onChange: (sessionId: string | null) => void;
}) {
  return (
    <Select value={value ?? NO_SESSION} onValueChange={(v) => onChange(v === NO_SESSION ? null : v)}>
      <SelectTrigger className="w-full sm:w-80">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SESSION}>Nenhuma aula</SelectItem>
        {sessions.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Conteudo = () => {
  const { trainingId } = useParams();
  const {
    posts,
    isLoading,
    createPost,
    updatePost,
    deletePost,
    uploadFile,
  } = useContentPosts(trainingId);
  const { data: sessions = [] } = useLiveSessions(trainingId);
  const { isAdminOrOwner, isMentor } = useUserRole();
  const canEdit = isAdminOrOwner || isMentor;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // ── new post state ──
  const [content, setContent] = useState("");
  const [sessionNew, setSessionNew] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState<PendingAttachment | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState(false);

  // ── edit state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSession, setEditSession] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingAttachment | null>(null);
  const [editExistingUrl, setEditExistingUrl] = useState<string | null>(null);
  const [editExistingName, setEditExistingName] = useState<string | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Upload a File and return its public URL
  const doUpload = async (file: File, setUploading: (v: boolean) => void): Promise<string> => {
    setUploading(true);
    try {
      return await uploadFile(file);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim() && !pendingNew) return;

    let attachment_url: string | null = null;
    let attachment_name: string | null = null;

    if (pendingNew) {
      attachment_url = await doUpload(pendingNew.file, setIsUploadingNew);
      attachment_name = pendingNew.file.name;
      // revoke object URL to free memory
      if (pendingNew.previewUrl) URL.revokeObjectURL(pendingNew.previewUrl);
    }

    createPost.mutate(
      { content, attachment_url, attachment_name, session_id: sessionNew },
      {
        onSuccess: () => {
          setContent("");
          setSessionNew(null);
          setPendingNew(null);
        },
      }
    );
  };

  const startEdit = (post: ContentPost) => {
    setEditingId(post.id);
    setEditContent(post.content === "<p></p>" ? "" : post.content);
    setEditSession(post.session_id);
    setPendingEdit(null);
    setEditExistingUrl(post.attachment_url ?? null);
    setEditExistingName(post.attachment_name ?? null);
  };

  const cancelEdit = () => {
    if (pendingEdit?.previewUrl) URL.revokeObjectURL(pendingEdit.previewUrl);
    setEditingId(null);
    setEditContent("");
    setEditSession(null);
    setPendingEdit(null);
    setEditExistingUrl(null);
    setEditExistingName(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editContent.trim() && !pendingEdit && !editExistingUrl) return;

    let attachment_url = editExistingUrl;
    let attachment_name = editExistingName;

    if (pendingEdit) {
      attachment_url = await doUpload(pendingEdit.file, setIsUploadingEdit);
      attachment_name = pendingEdit.file.name;
      if (pendingEdit.previewUrl) URL.revokeObjectURL(pendingEdit.previewUrl);
    }

    updatePost.mutate(
      { id: editingId, content: editContent, attachment_url, attachment_name, session_id: editSession },
      { onSuccess: cancelEdit }
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deletePost.mutate(deleteTargetId, { onSuccess: () => setDeleteTargetId(null) });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Conteúdo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Materiais e recursos publicados pela equipe do treinamento.
          </p>
        </div>

        {/* ── New post composer ── */}
        {canEdit && (
          <Card className="border shadow-none">
            <CardContent className="pt-5 pb-4 space-y-4">
              <FormSection label="Aula" hint="(opcional)">
                <SessionSelect sessions={sessions} value={sessionNew} onChange={setSessionNew} />
              </FormSection>

              <FormSection label="Mensagem">
                <FormattedTextarea
                  value={content}
                  onChange={setContent}
                  placeholder="Publique um novo conteúdo..."
                />
              </FormSection>

              <FormSection label="Anexo" hint="(opcional)">
                <AttachmentPickerField
                  pending={pendingNew}
                  onSelect={setPendingNew}
                  onRemove={() => {
                    if (pendingNew?.previewUrl) URL.revokeObjectURL(pendingNew.previewUrl);
                    setPendingNew(null);
                  }}
                  isUploading={isUploadingNew}
                />
              </FormSection>

              <div className="flex justify-end border-t pt-3">
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={
                    (!content.trim() && !pendingNew) ||
                    createPost.isPending ||
                    isUploadingNew
                  }
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Publicar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Posts list ── */}
        {posts.length === 0 ? (
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-xl bg-secondary p-4 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-medium text-foreground mb-1">Conteúdo em breve</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Os conteúdos aparecerão aqui quando forem publicados pela equipe.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const isEditing = editingId === post.id;
              const initials =
                `${post.profile?.username?.[0] ?? ""}${post.profile?.last_name?.[0] ?? ""}`.toUpperCase() ||
                "U";
              const session = post.session_id ? sessionById.get(post.session_id) : undefined;

              return (
                <Card key={post.id} className="border shadow-none">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={post.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-secondary text-muted-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {post.profile?.username ?? "Usuário"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                            {session && !isEditing && (
                              <Badge variant="outline" className="gap-1 border-primary/30 font-normal text-foreground">
                                <Video className="h-3 w-3 text-primary" />
                                {session.title}
                              </Badge>
                            )}
                          </div>
                          {canEdit && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => startEdit(post)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTargetId(post.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Body */}
                        {isEditing ? (
                          <div className="mt-3 space-y-4">
                            <FormSection label="Aula" hint="(opcional)">
                              <SessionSelect sessions={sessions} value={editSession} onChange={setEditSession} />
                            </FormSection>

                            <FormSection label="Mensagem">
                              <FormattedTextarea
                                value={editContent}
                                onChange={setEditContent}
                                placeholder="Edite o conteúdo..."
                              />
                            </FormSection>

                            <FormSection label="Anexo" hint="(opcional)">
                              {/* Show current attachment during edit with option to remove */}
                              {editExistingUrl && editExistingName && !pendingEdit && (
                                <div className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-2.5 py-1.5 text-xs max-w-xs">
                                  <DocIcon name={editExistingName} className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate flex-1 min-w-0">{editExistingName}</span>
                                  <button
                                    type="button"
                                    onClick={() => { setEditExistingUrl(null); setEditExistingName(null); }}
                                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                    aria-label="Remover anexo atual"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              {/* New attachment picker (shows only when no existing kept) */}
                              {!editExistingUrl && (
                                <AttachmentPickerField
                                  pending={pendingEdit}
                                  onSelect={setPendingEdit}
                                  onRemove={() => {
                                    if (pendingEdit?.previewUrl) URL.revokeObjectURL(pendingEdit.previewUrl);
                                    setPendingEdit(null);
                                  }}
                                  isUploading={isUploadingEdit}
                                />
                              )}
                            </FormSection>

                            <div className="flex justify-end gap-2 border-t pt-3">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={
                                  (!editContent.trim() && !pendingEdit && !editExistingUrl) ||
                                  updatePost.isPending ||
                                  isUploadingEdit
                                }
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {post.content && post.content !== "<p></p>" && (
                              <RichTextDisplay content={post.content} className="mt-1" />
                            )}

                            {/* Attachment: image inline or doc download */}
                            {post.attachment_url && post.attachment_name && (
                              <div className="mt-3 border-t pt-3">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <Paperclip className="h-3 w-3" /> Anexo
                                </p>
                                <AttachmentPreview
                                  url={post.attachment_url}
                                  name={post.attachment_name}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Este conteúdo será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Conteudo;