import { BookOpen, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DashboardData } from "@/hooks/useDashboardData";

interface Props {
  data: DashboardData;
}
export function LobbyMetrics({ data }: Props) {
  const nextSessionLabel = data.nextSession
    ? format(new Date(data.nextSession.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })
    : "Nenhuma";

  const metrics = [
    {
      title: "Próxima Aula",
      value: nextSessionLabel,
      link: data.nextSession?.meeting_url ?? "",
      subtitle: data.nextSession
        ? `${data.nextSession.title} - ${data.nextSession.trainings?.title ?? ""}`
        : "sem aulas agendadas",
      icon: Calendar,
    },
    
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div
          key={m.title}
          className="group rounded-xl border border-gold/30 bg-lobby-card p-5 transition-all hover:border-gold/50 hover:shadow-md hover:shadow-gold/10"
        >
          <div className="flex items-start justify-between" onClick={m.link ? () => window.open(m.link, "_blank") : undefined}>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                {m.title}
              </p>
              <p className="text-xl font-bold text-white">{m.value}</p>
              <p className="text-xs text-gold-muted">{m.subtitle}</p>
              <p className="text-xs text-blue-500 underline">{m.link}</p>
            </div>
            <div className="rounded-lg bg-gold/10 p-2.5 transition-colors group-hover:bg-gold/20">
              <m.icon className="h-4 w-4 text-gold" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
