import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveSession {
  id: string;
  training_id: string;
  title: string;
  meeting_url: string | null;
  scheduled_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** Duração assumida para aulas antigas, criadas antes de existir o horário de fim (ends_at). */
export const LIVE_WINDOW_HOURS = 3;

export type SessionStatus = "live" | "upcoming" | "past" | "content";

/** Fim da aula: ends_at definido pelo professor, ou início + LIVE_WINDOW_HOURS para aulas antigas. */
export function getSessionEnd(s: Pick<LiveSession, "scheduled_at" | "ends_at">): Date | null {
  if (s.ends_at) return new Date(s.ends_at);
  if (!s.scheduled_at) return null;
  return new Date(new Date(s.scheduled_at).getTime() + LIVE_WINDOW_HOURS * 60 * 60 * 1000);
}

/**
 * - content: aula só de conteúdo (sem "Ao vivo")
 * - upcoming: ao vivo, ainda não começou
 * - live: ao vivo sem data, ou entre o horário de início e o de fim
 * - past: ao vivo, já terminou
 */
export function getSessionStatus(
  s: Pick<LiveSession, "is_active" | "scheduled_at" | "ends_at">,
  now = new Date()
): SessionStatus {
  if (!s.is_active) return "content";
  if (!s.scheduled_at) return "live";
  if (now.getTime() < new Date(s.scheduled_at).getTime()) return "upcoming";
  return now.getTime() <= getSessionEnd(s)!.getTime() ? "live" : "past";
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
