import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Camera, KeyRound, Loader2, LogOut, Mail, Trash2 } from "lucide-react";
import { notify } from "@/components/feedback/notify";
import { getFullName, getInitials } from "@/lib/names";
import { getErrorMessage } from "@/lib/errors";
import { resizeImageToSquare } from "@/lib/image";

const AVATAR_BUCKET = "avatars";
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024; // 10 MB (a foto é reduzida antes do envio)

const nameSchema = z.object({
  username: z.string().trim().min(1, "Informe seu nome").max(50, "Máximo de 50 caracteres"),
  last_name: z.string().trim().min(1, "Informe seu sobrenome").max(50, "Máximo de 50 caracteres"),
});

/** Caminho do arquivo dentro do bucket, se a URL for de uma foto enviada por aqui. */
function storagePathFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

export default function Perfil() {
  const { user, signOut, resetPassword } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sendingReset, setSendingReset] = useState(false);
  const [username, setUsername] = useState("");
  const [lastName, setLastName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savingName, setSavingName] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Preenche o formulário quando o perfil carrega
  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setLastName(profile.last_name ?? "");
    }
  }, [profile]);

  const email = user?.email || "";
  const avatarUrl = profile?.avatar_url || undefined;
  const fullName = getFullName(profile, "Usuário");
  const initials = getInitials(fullName);
  const nameChanged =
    username.trim() !== (profile?.username ?? "") || lastName.trim() !== (profile?.last_name ?? "");

  /** Atualiza o perfil e renova os lugares que mostram nome/foto. */
  const refreshProfileData = () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["plaza-posts"] });
    queryClient.invalidateQueries({ queryKey: ["content-posts"] });
    queryClient.invalidateQueries({ queryKey: ["space-posts"] });
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const result = nameSchema.safeParse({ username, last_name: lastName });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((er) => {
        errs[er.path[0] as string] = er.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: result.data.username, last_name: result.data.last_name })
        .eq("user_id", user.id);
      if (error) throw error;
      refreshProfileData();
      notify.success("Nome atualizado");
    } catch (err) {
      notify.error("Erro ao salvar o nome", getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const removeOldAvatar = async (oldUrl?: string | null) => {
    const path = storagePathFromUrl(oldUrl);
    if (path && path.startsWith(`${user?.id}/`)) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => undefined);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      notify.error("Formato não suportado", "Use uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_ORIGINAL_SIZE) {
      notify.error("Imagem muito grande", "Escolha uma imagem de até 10 MB.");
      return;
    }

    setAvatarBusy(true);
    try {
      const blob = await resizeImageToSquare(file);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      await removeOldAvatar(profile?.avatar_url);
      refreshProfileData();
      notify.success("Foto de perfil atualizada");
    } catch (err) {
      notify.error("Erro ao atualizar a foto", getErrorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    setAvatarBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      if (error) throw error;
      await removeOldAvatar(profile.avatar_url);
      refreshProfileData();
      notify.deleted("Foto removida");
    } catch (err) {
      notify.error("Erro ao remover a foto", getErrorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;
    try {
      setSendingReset(true);
      await resetPassword(email);
      notify.success("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
    } catch {
      notify.error("Erro ao enviar e-mail de redefinição.");
    } finally {
      setSendingReset(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-10 px-4 animate-pulse">
          <Card>
            <CardHeader className="items-center text-center gap-3">
              <div className="h-24 w-24 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="relative mb-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-accent text-accent-foreground text-3xl">{initials}</AvatarFallback>
              </Avatar>
              {avatarBusy && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border shadow"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Alterar foto de perfil"
                title="Alterar foto de perfil"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_TYPES.join(",")}
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>
            <CardTitle className="text-lg">{fullName}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </p>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleRemoveAvatar}
                disabled={avatarBusy}
              >
                <Trash2 className="h-3 w-3" />
                Remover foto
              </Button>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
            <CardDescription>É assim que seu nome aparece para os outros participantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-username">Nome</Label>
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={50}
                    autoComplete="given-name"
                  />
                  {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-lastname">Sobrenome</Label>
                  <Input
                    id="profile-lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={50}
                    autoComplete="family-name"
                  />
                  {fieldErrors.last_name && <p className="text-xs text-destructive">{fieldErrors.last_name}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={email} readOnly disabled />
              </div>
              <Button type="submit" disabled={savingName || !nameChanged}>
                {savingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleResetPassword}
              disabled={sendingReset}
            >
              <KeyRound className="h-4 w-4" />
              {sendingReset ? "Enviando…" : "Alterar senha"}
            </Button>
            <Separator />
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
