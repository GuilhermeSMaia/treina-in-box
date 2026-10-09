import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PlazaAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface PlazaPost {
  id: string;
  training_id: string;
  user_id: string;
  content: string;
  attachments: PlazaAttachment[];
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface CreatePostPayload {
  content: string;
  attachments?: PlazaAttachment[];
}

interface UpdatePostPayload {
  id: string;
  content: string;
  attachments?: PlazaAttachment[];
}

function parseAttachments(value: Json | undefined): PlazaAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is PlazaAttachment & Json =>
      !!a && typeof a === "object" && typeof (a as Record<string, unknown>).url === "string"
  ) as unknown as PlazaAttachment[];
}

export function usePlazaPosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["plaza-posts", trainingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!trainingId) return [];
      const { data: posts, error } = await supabase
        .from("plaza_posts")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, last_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return (posts ?? []).map((p) => ({
        ...p,
        attachments: parseAttachments(p.attachments),
        profile: profileMap.get(p.user_id) ?? undefined,
      })) as PlazaPost[];
    },
    enabled: !!trainingId,
  });

  // Atualiza a conversa em tempo real quando alguém envia/edita/apaga mensagens
  useEffect(() => {
    if (!trainingId) return;
    const channel = supabase
      .channel(`plaza-posts-${trainingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plaza_posts",
          filter: `training_id=eq.${trainingId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["plaza-posts", trainingId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, queryClient]);

  const createPost = useMutation({
    mutationFn: async ({ content, attachments = [] }: CreatePostPayload) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("plaza_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        content,
        attachments: attachments as unknown as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao enviar mensagem. Tente novamente."),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content, attachments }: UpdatePostPayload) => {
      const { error } = await supabase
        .from("plaza_posts")
        .update({
          content,
          ...(attachments ? { attachments: attachments as unknown as Json } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao atualizar mensagem."),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("plaza_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Erro ao deletar mensagem."),
  });

  /** Upload de um anexo de mensagem (imagem, PDF, Word, PowerPoint). */
  const uploadFile = async (file: File): Promise<PlazaAttachment> => {
    if (!user?.id) throw new Error("Não autorizado");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(`Erro ao enviar "${file.name}".`);
      throw error;
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
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
