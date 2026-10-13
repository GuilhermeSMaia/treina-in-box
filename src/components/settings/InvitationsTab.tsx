import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTrainings } from "@/hooks/useTrainings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageCircle, Link2, Copy, Check, RotateCw, XCircle, Upload } from "lucide-react";
import { BulkImportDialog } from "@/components/settings/BulkImportDialog";
import { DataTableCard } from "@/components/settings/DataTableCard";
import { SearchInput } from "@/components/SearchInput";
import { StatusBadge, INVITATION_STATUS_BADGES, ROLE_BADGES } from "@/components/StatusBadge";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { notify } from "@/components/feedback/notify";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Channel = "email" | "whatsapp" | "link";

export function InvitationsTab() {
  const { user } = useAuth();
  const { isOwner, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const { data: trainings = [] } = useTrainings();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [channel, setChannel] = useState<Channel>("email");
  const [trainingId, setTrainingId] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);

  const allowedInviteRoles: AppRole[] = isOwner
    ? ["admin", "mentor", "student"]
    : isAdmin
      ? ["mentor", "student"]
      : ["student"];

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, "");

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchEmail = inv.email?.toLowerCase().includes(q);
        const matchPhone = inv.phone?.toLowerCase().includes(q);
        if (!matchEmail && !matchPhone) return false;
      }
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterChannel !== "all" && (inv.channel ?? "email") !== filterChannel) return false;
      if (filterRole !== "all" && inv.role !== filterRole) return false;
      return true;
    });
  }, [invitations, searchQuery, filterStatus, filterChannel, filterRole]);

  const sendInvite = useMutation({
    mutationFn: async () => {
  if (!user?.id) throw new Error("Não autenticado");

  const payload: Record<string, unknown> = {
    role,
    invited_by: user.id,
    channel,
    training_id: trainingId && trainingId !== "none" ? trainingId : null,
    email: channel === "email" ? email.trim().toLowerCase() : `link-${Date.now()}@invite`,
    phone: channel === "whatsapp" ? phone.trim() : null,
  };

  const { data, error } = await supabase
    .from("invitations")
    .insert(payload as any)
    .select()
    .single();

  if (error) throw error;

  // Se o token não veio no insert (trigger assíncrono), busca novamente
  if (!data.invite_token) {
    const { data: fetched, error: fetchError } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", data.id)
      .single();

    if (fetchError) throw fetchError;
    if (!fetched.invite_token) throw new Error("Token não gerado. Verifique o trigger no Supabase.");
    return fetched;
  }

  return data;
},    onSuccess: (data) => {
      const inviteLink = `${appUrl}/?invite=${data.invite_token}`;

      if (channel === "whatsapp") {
        const cleanPhone = phone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${inviteLink}`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
        notify.success("Convite criado", "WhatsApp aberto com o link de convite.");
      } else if (channel === "link") {
        navigator.clipboard.writeText(inviteLink);
        notify.success("Link gerado e copiado!", inviteLink);
      } else {
        notify.success("Convite enviado", `Convite para ${email} registrado com sucesso.`);
      }

      setEmail("");
      setPhone("");
      setRole("student");
      setTrainingId("");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => notify.error("Erro ao enviar convite", err.message),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.deleted("Convite cancelado");
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (err: Error) => notify.error("Erro ao cancelar", err.message),
  });

  const resendInvite = (inv: any) => {
    const inviteLink = `${appUrl}/?invite=${inv.invite_token}`;
    const ch = inv.channel ?? "email";
    if (ch === "whatsapp") {
      const cleanPhone = (inv.phone ?? "").replace(/\D/g, "");
      const msg = encodeURIComponent(`Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${inviteLink}`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      notify.success("WhatsApp aberto com o convite");
    } else if (ch === "link") {
      navigator.clipboard.writeText(inviteLink);
      notify.success("Link copiado novamente!");
    } else {
      navigator.clipboard.writeText(inviteLink);
      notify.success("Link do convite copiado", `Envie manualmente para ${inv.email}`);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${appUrl}/?invite=${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CHANNELS = {
    email: { icon: Mail, label: "Email" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp" },
    link: { icon: Link2, label: "Link" },
  } as const;
  const channelInfo = (ch: string | null) => CHANNELS[(ch ?? "email") as Channel] ?? CHANNELS.email;

  const cancellingInvite = invitations.find((inv) => inv.id === cancellingId);

  const trainingName = (tid: string | null) => {
    if (!tid) return "—";
    return trainings.find((t) => t.id === tid)?.title ?? tid;
  };

  const canSubmit = () => {
    if (channel === "email") return email.trim().length > 0;
    if (channel === "whatsapp") return phone.trim().length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Enviar Convite</CardTitle>
            <CardDescription>Convide novos usuários por email, WhatsApp ou link.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Importar Lista
          </Button>
        </CardHeader>
        <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit()) sendInvite.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Channel */}
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />Email</span></SelectItem>
                    <SelectItem value="whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span></SelectItem>
                    <SelectItem value="link"><span className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5" />Gerar Link</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedInviteRoles.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_BADGES[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Training */}
              <div className="space-y-1.5">
                <Label>Treinamento</Label>
                <Select value={trainingId} onValueChange={setTrainingId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {trainings.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional input */}
            <div className="flex flex-col sm:flex-row gap-3">
              {channel === "email" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" placeholder="usuario@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
              {channel === "whatsapp" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="invite-phone">Telefone (com DDD e código do país)</Label>
                  <Input id="invite-phone" type="tel" placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              )}
              {channel === "link" && (
                <p className="flex-1 text-sm text-muted-foreground self-end pb-2">
                  O link será gerado automaticamente. Copie e compartilhe.
                </p>
              )}
              <div className="flex items-end">
                <Button type="submit" disabled={sendInvite.isPending || !canSubmit()}>
                  {channel === "email" && <><Mail className="mr-2 h-4 w-4" />Enviar</>}
                  {channel === "whatsapp" && <><MessageCircle className="mr-2 h-4 w-4" />Enviar via WhatsApp</>}
                  {channel === "link" && <><Link2 className="mr-2 h-4 w-4" />Gerar Link</>}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTableCard
        title="Convites Enviados"
        toolbar={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SearchInput placeholder="Buscar por email..." value={searchQuery} onChange={setSearchQuery} />
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              allLabel="Todos os status"
              options={Object.entries(INVITATION_STATUS_BADGES).map(([value, s]) => ({ value, label: s.label }))}
            />
            <FilterSelect
              value={filterChannel}
              onChange={setFilterChannel}
              allLabel="Todos os canais"
              options={Object.entries(CHANNELS).map(([value, c]) => ({ value, label: c.label }))}
            />
            <FilterSelect
              value={filterRole}
              onChange={setFilterRole}
              allLabel="Todas as roles"
              options={(["admin", "mentor", "student"] as const).map((value) => ({ value, label: ROLE_BADGES[value].label }))}
            />
          </div>
        }
        items={filteredInvitations}
        getRowKey={(inv) => inv.id}
        isLoading={isLoading}
        emptyMessage="Nenhum convite encontrado."
        columns={[
          {
            header: "Email / Contato",
            cellClassName: "font-medium",
            cell: (inv) => (inv.channel === "whatsapp" ? inv.phone || inv.email : inv.email),
          },
          {
            header: "Canal",
            cell: (inv) => {
              const { icon: Icon, label } = channelInfo(inv.channel);
              return (
                <span className="flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              );
            },
          },
          { header: "Role", cell: (inv) => ROLE_BADGES[inv.role]?.label ?? inv.role },
          { header: "Treinamento", cellClassName: "text-xs", cell: (inv) => trainingName(inv.training_id) },
          { header: "Status", cell: (inv) => <StatusBadge value={inv.status} map={INVITATION_STATUS_BADGES} /> },
          {
            header: "Data",
            cellClassName: "text-xs text-muted-foreground",
            cell: (inv) => new Date(inv.created_at).toLocaleDateString("pt-BR"),
          },
          {
            header: "",
            cell: (inv) => (
              <>
                {inv.invite_token && (
                  <Button variant="ghost" size="sm" onClick={() => copyLink(inv.invite_token)} className="h-7 px-2" title="Copiar link">
                    {copiedId === inv.invite_token ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                {inv.status === "pending" && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => resendInvite(inv)} className="h-7 px-2" title="Reenviar">
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancellingId(inv.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      title="Cancelar convite"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </>
            ),
          },
        ]}
      />

      <ConfirmDeleteDialog
        open={!!cancellingId}
        onOpenChange={(o) => !o && setCancellingId(null)}
        onConfirm={() => cancellingId && cancelInvite.mutate(cancellingId)}
        icon={XCircle}
        title="Cancelar convite?"
        description={`O convite para ${cancellingInvite?.email ?? ""} será cancelado e o link deixará de funcionar.`}
        confirmLabel="Cancelar convite"
        cancelLabel="Voltar"
        isPending={cancelInvite.isPending}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
