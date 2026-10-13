import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ContentPost {
  id: string;
  training_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  attachment_url: string | null;   // single text column
  attachment_name: string | null;  // single text column
  session_id: string | null;       // aula (live_sessions) opcional
  profile?: {
    username: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

// ─── Payload types for mutations ──────────────────────────────────────────────

interface CreatePostPayload {
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  session_id?: string | null;
}

interface UpdatePostPayload {
  id: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  session_id?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContentPosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["content-posts", trainingId];

  // ── Query ──────────────────────────────────────────────────────────────────

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!trainingId) return [];

      const { data: posts, error } = await supabase
        .from("content_posts")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, last_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return (posts ?? []).map((p) => ({
        id: p.id,
        training_id: p.training_id,
        user_id: p.user_id,
        content: p.content,
        created_at: p.created_at,
        updated_at: p.updated_at,
        attachment_url: (p as unknown as Record<string, unknown>)["attachment_url"] as string | null ?? null,
        attachment_name: (p as unknown as Record<string, unknown>)["attachment_name"] as string | null ?? null,
        session_id: p.session_id ?? null,
        profile: profileMap.get(p.user_id) ?? undefined,
      })) satisfies ContentPost[];
    },
    enabled: !!trainingId,
  });

  // ── Create ─────────────────────────────────────────────────────────────────

  const createPost = useMutation({
    mutationFn: async ({ content, attachment_url, attachment_name, session_id }: CreatePostPayload) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("content_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        content,
        attachment_url: attachment_url ?? null,
        attachment_name: attachment_name ?? null,
        session_id: session_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao publicar conteúdo. Tente novamente."),
  });

  // ── Update ─────────────────────────────────────────────────────────────────

  const updatePost = useMutation({
    mutationFn: async ({ id, content, attachment_url, attachment_name, session_id }: UpdatePostPayload) => {
      const { error } = await supabase
        .from("content_posts")
        .update({
          content,
          attachment_url: attachment_url ?? null,
          attachment_name: attachment_name ?? null,
          session_id: session_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao atualizar conteúdo."),
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("content_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao deletar conteúdo."),
  });

  // ── Upload helpers ─────────────────────────────────────────────────────────

  /** Upload an inline image (used by the rich-text editor). */
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) {
      toast.error("Erro ao enviar imagem.");
      return null;
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  /**
   * Upload a post attachment (image, PDF, Word, PowerPoint).
   * Uses the same "post-images" bucket — rename the bucket in both places
   * if you prefer a dedicated "post-attachments" bucket.
   */
  const uploadFile = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("Não autorizado");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error("Erro ao enviar arquivo.");
      throw error;
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    createPost,
    updatePost,
    deletePost,
    uploadImage,
    uploadFile,
  };
}