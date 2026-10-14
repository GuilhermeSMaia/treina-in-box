import { useState } from "react";
import { format } from "date-fns";
import { Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { LiveSession } from "@/hooks/useLiveSessions";

export interface SessionFormValues {
  title: string;
  meeting_url: string;
  /** yyyy-MM-dd, horário local */
  date: string;
  /** HH:mm, horário local */
  start_time: string;
  /** HH:mm, horário local */
  end_time: string;
  is_active: boolean;
}

// Converte os horários salvos (UTC) para o horário local que os inputs date/time esperam
const toFormValues = (s?: LiveSession | null): SessionFormValues => {
  if (!s) return { title: "", meeting_url: "", date: "", start_time: "", end_time: "", is_active: false };
  const start = s.scheduled_at ? new Date(s.scheduled_at) : null;
  const end = s.ends_at ? new Date(s.ends_at) : null;
  return {
    title: s.title,
    meeting_url: s.meeting_url ?? "",
    date: start ? format(start, "yyyy-MM-dd") : "",
    start_time: start ? format(start, "HH:mm") : "",
    end_time: end ? format(end, "HH:mm") : "",
    is_active: s.is_active,
  };
};

interface SessionFormProps {
  session?: LiveSession | null;
  isPending?: boolean;
  onSubmit: (values: SessionFormValues) => void;
  onCancel: () => void;
}

export function SessionForm({ session, isPending, onSubmit, onCancel }: SessionFormProps) {
  const [form, setForm] = useState<SessionFormValues>(() => toFormValues(session));
  const [timeError, setTimeError] = useState<string | null>(null);
  const isEditing = !!session;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sem "Ao vivo", a sessão não tem link nem agendamento: a data exibida é a da postagem.
    if (!form.is_active) {
      onSubmit({ ...form, meeting_url: "", date: "", start_time: "", end_time: "" });
      return;
    }
    // Horários no formato HH:mm comparam corretamente como texto
    if (form.end_time <= form.start_time) {
      setTimeError("O horário de fim deve ser depois do horário de início.");
      return;
    }
    setTimeError(null);
    onSubmit(form);
  };

  return (
    <Card className="border-primary/20 border shadow-none">
      <CardContent className="py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {isEditing ? "Editar sessão" : "Nova sessão"}
            </h3>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Aula 01 — Introdução"
                required
              />
            </div>
            <div className="flex items-center gap-3 sm:pt-6">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ao vivo</Label>
            </div>
            {form.is_active && (
              <>
                <div className="space-y-1.5">
                  <Label>URL da reunião</Label>
                  <Input
                    value={form.meeting_url}
                    onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data da aula</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <div className="space-y-1.5">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  A aula aparece como "ao vivo" para os alunos entre o horário de início e o de fim.
                </p>
                {timeError && <p className="text-xs text-destructive sm:col-span-2">{timeError}</p>}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              <Save className="mr-1.5 h-4 w-4" />
              {isEditing ? "Salvar" : "Criar"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
