import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { ChatAttachment, parseAttachments } from "@/components/chat/chat-utils";

export interface SpacePost {
  id: string;
  training_id: string;
  user_id: string;
  session_id: string | null;
  content: string;
  attachments: ChatAttachment[];
  created_at: string;
  updated_at: string;
}

interface CreatePostPayload {
  content: string;
  attachments?: ChatAttachment[];
  sessionId?: string | null;
}

interface UpdatePostPayload {
  id: string;
  content: string;
  attachments?: ChatAttachment[];
}

export function useSpacePosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["space-posts", trainingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from("space_posts")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        attachments: parseAttachments(p.attachments),
      })) as SpacePost[];
    },
    enabled: !!trainingId,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, attachments = [], sessionId = null }: CreatePostPayload) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("space_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        session_id: sessionId,
        content,
        attachments: attachments as unknown as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao salvar anotação. Tente novamente."),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content, attachments }: UpdatePostPayload) => {
      const { error } = await supabase
        .from("space_posts")
        .update({
          content,
          ...(attachments ? { attachments: attachments as unknown as Json } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao atualizar anotação."),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("space_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao deletar anotação."),
  });

  /** Upload de um anexo de anotação (imagem, PDF, Word, PowerPoint). */
  const uploadFile = async (file: File): Promise<ChatAttachment> => {
    if (!user?.id) throw new Error("Não autorizado");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("note-images")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(`Erro ao enviar "${file.name}".`);
      throw error;
    }
    const { data: urlData } = supabase.storage.from("note-images").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, type: file.type, size: file.size };
  };

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    createPost,
    updatePost,
    deletePost,
    uploadFile,
  };
}
