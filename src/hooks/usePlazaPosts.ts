import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/components/feedback/notify";
import type { Json } from "@/integrations/supabase/types";
import { parseAttachments, type ChatReaction } from "@/components/chat/chat-utils";

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
  reply_to_id: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  profile?: {
    username: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface CreatePostPayload {
  content: string;
  attachments?: PlazaAttachment[];
  replyToId?: string | null;
}

interface ReactionRow {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
}

interface UpdatePostPayload {
  id: string;
  content: string;
  attachments?: PlazaAttachment[];
}

export function usePlazaPosts(trainingId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["plaza-posts", trainingId];
  const reactionsKey = ["plaza-reactions", trainingId];

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

  const reactionsQuery = useQuery({
    queryKey: reactionsKey,
    queryFn: async () => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from("plaza_reactions")
        .select("id, post_id, user_id, emoji")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReactionRow[];
    },
    enabled: !!trainingId,
  });

  // Agrupa as reações por mensagem: { emoji, userIds }[]
  const reactionsByPost = useMemo(() => {
    const map = new Map<string, ChatReaction[]>();
    for (const row of reactionsQuery.data ?? []) {
      const list = map.get(row.post_id) ?? [];
      const group = list.find((g) => g.emoji === row.emoji);
      if (group) group.userIds.push(row.user_id);
      else list.push({ emoji: row.emoji, userIds: [row.user_id] });
      map.set(row.post_id, list);
    }
    return map;
  }, [reactionsQuery.data]);

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plaza_reactions",
          filter: `training_id=eq.${trainingId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["plaza-reactions", trainingId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, queryClient]);

  const createPost = useMutation({
    mutationFn: async ({ content, attachments = [], replyToId = null }: CreatePostPayload) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      const { error } = await supabase.from("plaza_posts").insert({
        training_id: trainingId,
        user_id: user.id,
        content,
        attachments: attachments as unknown as Json,
        reply_to_id: replyToId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => notify.error("Erro ao enviar mensagem. Tente novamente."),
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
    onError: () => notify.error("Erro ao atualizar mensagem."),
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
    onError: () => notify.error("Erro ao deletar mensagem."),
  });

  /** Fixa ou desafixa uma mensagem (apenas moderadores; o banco também valida). */
  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      if (!user?.id) throw new Error("Não autorizado");
      const { error } = await supabase
        .from("plaza_posts")
        .update(
          pinned
            ? { pinned_at: new Date().toISOString(), pinned_by: user.id }
            : { pinned_at: null, pinned_by: null }
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => notify.error("Não foi possível fixar/desafixar a mensagem."),
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ postId, emoji, remove }: { postId: string; emoji: string; remove: boolean }) => {
      if (!user?.id || !trainingId) throw new Error("Não autorizado");
      if (remove) {
        const { error } = await supabase
          .from("plaza_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plaza_reactions").insert({
          post_id: postId,
          training_id: trainingId,
          user_id: user.id,
          emoji,
        });
        // 23505 = já reagiu (duplo clique): não é erro para o usuário
        if (error && error.code !== "23505") throw error;
      }
    },
    // Atualização otimista: a reação aparece na hora
    onMutate: async ({ postId, emoji, remove }) => {
      await queryClient.cancelQueries({ queryKey: reactionsKey });
      const previous = queryClient.getQueryData<ReactionRow[]>(reactionsKey);
      queryClient.setQueryData<ReactionRow[]>(reactionsKey, (old = []) =>
        remove
          ? old.filter((r) => !(r.post_id === postId && r.user_id === user?.id && r.emoji === emoji))
          : [...old, { id: `tmp-${crypto.randomUUID()}`, post_id: postId, user_id: user!.id, emoji }]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(reactionsKey, context.previous);
      notify.error("Não foi possível reagir à mensagem.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reactionsKey }),
  });

  /** Reage com o emoji; se já tinha reagido com ele, remove a reação. */
  const toggleReaction = (postId: string, emoji: string) => {
    const rows = queryClient.getQueryData<ReactionRow[]>(reactionsKey) ?? [];
    const remove = rows.some((r) => r.post_id === postId && r.user_id === user?.id && r.emoji === emoji);
    reactionMutation.mutate({ postId, emoji, remove });
  };

  /** Upload de um anexo de mensagem (imagem, PDF, Word, PowerPoint). */
  const uploadFile = async (file: File): Promise<PlazaAttachment> => {
    if (!user?.id) throw new Error("Não autorizado");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type });
    if (error) {
      notify.error(`Erro ao enviar "${file.name}".`);
      throw error;
    }
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, type: file.type, size: file.size };
  };

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    reactionsByPost,
    createPost,
    updatePost,
    deletePost,
    togglePin,
    toggleReaction,
    uploadFile,
  };
}
