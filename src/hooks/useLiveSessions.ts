import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveSession {
  id: string;
  training_id: string;
  title: string;
  meeting_url: string | null;
  scheduled_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** Por quanto tempo, após o horário marcado, a aula continua "ao vivo". */
export const LIVE_WINDOW_HOURS = 3;

export type SessionStatus = "live" | "upcoming" | "past" | "content";

/**
 * - content: aula só de conteúdo (sem "Ao vivo")
 * - upcoming: ao vivo, ainda não começou
 * - live: ao vivo sem data, ou entre o horário marcado e LIVE_WINDOW_HOURS depois
 * - past: ao vivo, já passou da janela
 */
export function getSessionStatus(s: LiveSession, now = new Date()): SessionStatus {
  if (!s.is_active) return "content";
  if (!s.scheduled_at) return "live";
  const start = new Date(s.scheduled_at).getTime();
  if (now.getTime() < start) return "upcoming";
  return now.getTime() <= start + LIVE_WINDOW_HOURS * 60 * 60 * 1000 ? "live" : "past";
}

export function useLiveSessions(trainingId: string | undefined) {
  return useQuery({
    queryKey: ["live-sessions", trainingId],
    queryFn: async (): Promise<LiveSession[]> => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("training_id", trainingId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trainingId,
  });
}
