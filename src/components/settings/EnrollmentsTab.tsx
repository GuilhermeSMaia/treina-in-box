import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTableCard } from "@/components/settings/DataTableCard";
import { notify } from "@/components/feedback/notify";
import { getFullName } from "@/lib/names";
import { UserPlus, Trash2 } from "lucide-react";

export function EnrollmentsTab() {
  const queryClient = useQueryClient();
  const [selectedTraining, setSelectedTraining] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("id, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, last_name")
        .order("username, last_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["enrollments", selectedTraining],
    queryFn: async () => {
      if (!selectedTraining) return [];
      const { data, error } = await supabase
        .from("training_enrollments")
        .select("id, user_id, enrolled_at")
        .eq("training_id", selectedTraining);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedTraining,
  });

  const enrolledUserIds = new Set(enrollments.map((e) => e.user_id));

  const addEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedTraining || !selectedUser) throw new Error("Selecione treinamento e aluno");
      const { error } = await supabase.from("training_enrollments").insert({
        training_id: selectedTraining,
        user_id: selectedUser,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Aluno matriculado no treinamento");
      setSelectedUser("");
      queryClient.invalidateQueries({ queryKey: ["enrollments", selectedTraining] });
    },
    onError: (err: Error) => notify.error("Erro ao matricular", err.message),
  });

  const removeEnrollment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.deleted("Matrícula removida");
      queryClient.invalidateQueries({ queryKey: ["enrollments", selectedTraining] });
    },
    onError: (err: Error) => notify.error("Erro ao remover", err.message),
  });

  const getUserName = (userId: string) => getFullName(students.find((s) => s.user_id === userId));
  const availableStudents = students.filter((s) => !enrolledUserIds.has(s.user_id));

  return (
    <DataTableCard
      title="Matrículas"
      description="Vincule alunos a treinamentos específicos."
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Select value={selectedTraining} onValueChange={setSelectedTraining}>
              <SelectTrigger><SelectValue placeholder="Selecione um treinamento" /></SelectTrigger>
              <SelectContent>
                {trainings.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTraining && (
            <>
              <div className="flex-1">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{getFullName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addEnrollment.mutate()} disabled={!selectedUser || addEnrollment.isPending}>
                <UserPlus className="mr-1 h-4 w-4" />Matricular
              </Button>
            </>
          )}
        </div>
      }
      items={enrollments}
      getRowKey={(e) => e.id}
      isLoading={!!selectedTraining && isLoading}
      emptyMessage={
        selectedTraining
          ? "Nenhum aluno matriculado neste treinamento."
          : "Selecione um treinamento para ver os alunos matriculados."
      }
      columns={[
        { header: "Aluno", cellClassName: "font-medium", cell: (e) => getUserName(e.user_id) },
        {
          header: "Inscrito em",
          cellClassName: "text-xs text-muted-foreground",
          cell: (e) => new Date(e.enrolled_at).toLocaleDateString("pt-BR"),
        },
        {
          header: "Ações",
          className: "text-right",
          cell: (e) => (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeEnrollment.mutate(e.id)}
              disabled={removeEnrollment.isPending}
              aria-label="Remover matrícula"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          ),
        },
      ]}
    />
  );
}
