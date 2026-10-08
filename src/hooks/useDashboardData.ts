import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    training_id: string;
    meeting_url?: string | null;
    trainings: { title: string } | null;
  } | null;
  totalPosts: number;
}

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-data", user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error("Not authenticated");

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
          .select("title, scheduled_at, training_id, meeting_url, trainings(title)")
          .gte("scheduled_at", new Date().toISOString())
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

      return {
        trainings: trainingData,
        nextSession: nextSessionRes.data?.[0] ?? null,
        totalPosts: postsRes.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });
}
