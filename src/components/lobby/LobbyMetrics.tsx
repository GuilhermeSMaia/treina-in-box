import { Calendar, Video } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/hooks/useDashboardData";

interface Props {
  data: DashboardData;
}
export function LobbyMetrics({ data }: Props) {
  const session = data.nextSession;
  const isLive = session?.isLive ?? false;
  const endTime = session?.ends_at ? format(new Date(session.ends_at), "HH:mm") : null;
  const nextSessionLabel = session
    ? isLive
      ? endTime ? `Agora, até ${endTime}` : "Acontecendo agora"
      : format(new Date(session.scheduled_at), "dd MMM, HH:mm", { locale: ptBR }) + (endTime ? ` – ${endTime}` : "")
    : "Nenhuma";

  const metrics = [
    {
      title: isLive ? "Aula ao vivo" : "Próxima Aula",
      value: nextSessionLabel,
      link: data.nextSession?.meeting_url ?? "",
      subtitle: data.nextSession
        ? `${data.nextSession.title} - ${data.nextSession.trainings?.title ?? ""}`
        : "sem aulas agendadas",
      icon: isLive ? Video : Calendar,
      highlight: isLive,
    },

  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div
          key={m.title}
          className={cn(
            "group rounded-xl border border-gold/30 bg-lobby-card p-5 transition-all hover:border-gold/50 hover:shadow-md hover:shadow-gold/10",
            m.highlight && "border-2 border-red-500 shadow-lg shadow-red-500/30 ring-2 ring-red-500/40 ring-offset-2 ring-offset-background hover:border-red-400 hover:shadow-red-500/40",
            m.link && "cursor-pointer"
          )}
        >
          <div className="flex items-start justify-between" onClick={m.link ? () => window.open(m.link, "_blank") : undefined}>
            <div className="space-y-1.5">
              <p className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider", m.highlight ? "text-red-400" : "text-gold")}>
                {m.highlight && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                )}
                {m.title}
              </p>
              <p className="text-xl font-bold text-white">{m.value}</p>
              <p className="text-xs text-gold-muted">{m.subtitle}</p>
              {m.highlight && m.link ? (
                <span className="mt-2 inline-flex rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-red-600">
                  Entrar na aula
                </span>
              ) : (
                <p className="text-xs text-blue-500 underline">{m.link}</p>
              )}
            </div>
            <div className={cn("rounded-lg p-2.5 transition-colors", m.highlight ? "bg-red-500/15 group-hover:bg-red-500/25" : "bg-gold/10 group-hover:bg-gold/20")}>
              <m.icon className={cn("h-4 w-4", m.highlight ? "text-red-400" : "text-gold")} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
