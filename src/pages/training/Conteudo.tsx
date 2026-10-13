import { ReactNode, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Send, X, Paperclip } from "lucide-react";
import { FileAttachment } from "@/components/FileAttachment";
import { ContentPostCard } from "@/components/content/ContentPostCard";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import { useContentPosts, ContentPost } from "@/hooks/useContentPosts";
import { useLiveSessions, LiveSession } from "@/hooks/useLiveSessions";
import { useUserRole } from "@/hooks/useUserRole";
import { FormattedTextarea } from "@/components/FormattedTextarea";
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

const ACCEPTED_ATTR = ACCEPTED_MIME.join(",");

interface PendingAttachment {
  file: File;
  previewUrl: string; 
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
      {pending && (
        <FileAttachment
          name={pending.file.name}
          type={pending.file.type}
          size={pending.file.size}
          previewUrl={pending.previewUrl || undefined}
          isUploading={isUploading}
          onRemove={onRemove}
        />
      )}
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
  // Vindo da tela da aula (?aula=<id>), o novo conteúdo já começa vinculado a ela
  const [searchParams] = useSearchParams();
  const [sessionNew, setSessionNew] = useState<string | null>(searchParams.get("aula"));
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
          notify.success("Conteúdo publicado", "Ele já está disponível para a turma.");
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
      {
        onSuccess: () => {
          cancelEdit();
          notify.success("Conteúdo atualizado");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deletePost.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteTargetId(null);
        notify.deleted("Conteúdo excluído");
      },
    });
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
              const session = post.session_id ? sessionById.get(post.session_id) : undefined;

              return (
                <ContentPostCard
                  key={post.id}
                  post={post}
                  session={session}
                  trainingId={trainingId}
                  onEdit={canEdit ? () => startEdit(post) : undefined}
                  onDelete={canEdit ? () => setDeleteTargetId(post.id) : undefined}
                >
                  {isEditing ? (
                    <div className="space-y-4">
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
                          <FileAttachment
                            name={editExistingName}
                            url={editExistingUrl}
                            onRemove={() => { setEditExistingUrl(null); setEditExistingName(null); }}
                          />
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
                  ) : undefined}
                </ContentPostCard>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Excluir conteúdo?"
        description="Este conteúdo será removido permanentemente. Esta ação não pode ser desfeita."
        isPending={deletePost.isPending}
      />
    </AppLayout>
  );
};

export default Conteudo;