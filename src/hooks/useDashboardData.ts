import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LIVE_WINDOW_HOURS, getSessionStatus } from "@/hooks/useLiveSessions";

export interface Training {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
}

export interface DashboardData {
  trainings: (Training & {
    moduleCount: number;
    lessonCount: number;
    completedCount: number;
  })[];
  nextSession: {
    title: string;
    scheduled_at: string;
    ends_at: string | null;
    training_id: string;
    meeting_url?: string | null;
    trainings: { title: string } | null;
    /** Entre o horário de início e o de fim da aula */
    isLive: boolean;
  } | null;
  totalPosts: number;
}

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-data", user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Aulas que ainda não terminaram: fim no futuro, ou (aulas antigas sem fim)
      // início há menos de LIVE_WINDOW_HOURS
      const now = new Date();
      const liveSince = new Date(now.getTime() - LIVE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      // Fetch all in parallel
      const [
        trainingsRes,
        modulesRes,
        lessonsRes,
        nextSessionRes,
        postsRes,
      ] = await Promise.all([
        supabase.from("trainings").select("*").order("created_at", { ascending: false }),
        supabase.from("training_modules").select("id, training_id"),
        supabase.from("training_lessons").select("id, module_id"),
        supabase
          .from("live_sessions")
          .select("title, scheduled_at, ends_at, is_active, training_id, meeting_url, trainings(title)")
          .eq("is_active", true)
          .not("scheduled_at", "is", null)
          .or(`ends_at.gte.${now.toISOString()},and(ends_at.is.null,scheduled_at.gte.${liveSince})`)
          .order("scheduled_at", { ascending: true })
          .limit(1),
        supabase.from("plaza_posts").select("id", { count: "exact", head: true }),
      ]);

      if (trainingsRes.error) throw trainingsRes.error;

      const trainings = trainingsRes.data ?? [];
      const modules = modulesRes.data ?? [];
      const lessons = lessonsRes.data ?? [];

      // Build module->training map
      const moduleTrainingMap = new Map(modules.map((m) => [m.id, m.training_id]));

      // Build training enrichment
      const trainingData = trainings.map((t) => {
        const trainingModuleIds = modules
          .filter((m) => m.training_id === t.id)
          .map((m) => m.id);
        const trainingLessons = lessons.filter((l) =>
          trainingModuleIds.includes(l.module_id)
        );

        return {
          ...t,
          moduleCount: trainingModuleIds.length,
          lessonCount: trainingLessons.length,
          completedCount: 0,
        };
      });

      const session = nextSessionRes.data?.[0];

      return {
        trainings: trainingData,
        nextSession: session
          ? { ...session, isLive: getSessionStatus(session, now) === "live" }
          : null,
        totalPosts: postsRes.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });
}
