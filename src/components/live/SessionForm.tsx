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
  scheduled_at: string;
  is_active: boolean;
}

const toFormValues = (s?: LiveSession | null): SessionFormValues =>
  s
    ? {
        title: s.title,
        meeting_url: s.meeting_url ?? "",
        // Converte o horário salvo (UTC) para o horário local que o input datetime-local espera
        scheduled_at: s.scheduled_at ? format(new Date(s.scheduled_at), "yyyy-MM-dd'T'HH:mm") : "",
        is_active: s.is_active,
      }
    : { title: "", meeting_url: "", scheduled_at: "", is_active: false };

interface SessionFormProps {
  session?: LiveSession | null;
  isPending?: boolean;
  onSubmit: (values: SessionFormValues) => void;
  onCancel: () => void;
}

export function SessionForm({ session, isPending, onSubmit, onCancel }: SessionFormProps) {
  const [form, setForm] = useState<SessionFormValues>(() => toFormValues(session));
  const isEditing = !!session;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sem "Ao vivo", a sessão não tem link nem agendamento: a data exibida é a da postagem.
    onSubmit(form.is_active ? form : { ...form, meeting_url: "", scheduled_at: "" });
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
                  <Label>Data e hora</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  />
                </div>
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
