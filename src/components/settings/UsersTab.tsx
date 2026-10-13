import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTableCard } from "@/components/settings/DataTableCard";
import { SearchInput } from "@/components/SearchInput";
import { StatusBadge, ROLE_BADGES, ENROLLMENT_STATUS_BADGES } from "@/components/StatusBadge";
import { notify } from "@/components/feedback/notify";
import { getFullName } from "@/lib/names";
import { ShieldOff, RefreshCw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProfileWithRole {
  id: string;
  user_id: string;
  username: string | null;
  last_name: string | null;
  enrollment_status: string;
  role: AppRole | null;
}

export function UsersTab() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, username, last_name, enrollment_status")
        .order("username", { ascending: true });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole>();
      for (const r of roles ?? []) {
        roleMap.set(r.user_id, r.role as AppRole);
      }

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? null,
      })) as ProfileWithRole[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: AppRole }) => {
      const { data, error } = await supabase.functions.invoke("manage-user-role", {
        body: { target_user_id: targetUserId, role: newRole, action: "assign" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      notify.success("Role atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (err: Error) => notify.error("Erro ao alterar role", err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ enrollment_status: status })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-users-with-roles"] });
    },
    onError: (err: Error) => notify.error("Erro ao atualizar", err.message),
  });

  const q = search.toLowerCase();
  const filtered = users.filter((p) => !q || getFullName(p, "").toLowerCase().includes(q));

  const allowedRoles: AppRole[] = isOwner ? ["admin", "mentor", "student"] : ["mentor", "student"];

  return (
    <DataTableCard
      title="Gestão de Usuários"
      description="Gerencie roles e status dos usuários."
      toolbar={<SearchInput placeholder="Buscar por nome..." value={search} onChange={setSearch} />}
      items={filtered}
      getRowKey={(p) => p.id}
      isLoading={isLoading}
      emptyMessage="Nenhum usuário encontrado."
      columns={[
        { header: "Nome", cellClassName: "font-medium", cell: (p) => getFullName(p) },
        { header: "Role", cell: (p) => <StatusBadge value={p.role} map={ROLE_BADGES} fallback="Sem role" /> },
        { header: "Status", cell: (p) => <StatusBadge value={p.enrollment_status} map={ENROLLMENT_STATUS_BADGES} /> },
        {
          header: "Ações",
          className: "text-right",
          cell: (p) => (
            <div className="flex items-center justify-end gap-2">
              {p.role !== "owner" && p.user_id !== user?.id && (
                <Select
                  value={p.role ?? ""}
                  onValueChange={(v) => changeRole.mutate({ targetUserId: p.user_id, newRole: v as AppRole })}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_BADGES[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {p.enrollment_status !== "active" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "active" })} disabled={updateStatus.isPending}>
                  <RefreshCw className="mr-1 h-3 w-3" />Renovar
                </Button>
              )}
              {p.enrollment_status !== "blocked" && p.role !== "owner" && (
                <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ userId: p.user_id, status: "blocked" })} disabled={updateStatus.isPending}>
                  <ShieldOff className="mr-1 h-3 w-3" />Bloquear
                </Button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
