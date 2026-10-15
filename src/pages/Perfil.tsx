import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, KeyRound, Mail } from "lucide-react";
import { notify } from "@/components/feedback/notify";

export default function Perfil() {
  const { user, signOut, resetPassword } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const [sendingReset, setSendingReset] = useState(false);

  const name = profile?.username || "Usuário";
  const lastName = profile?.last_name || "";
  const email = user?.email || "";
  const avatarUrl = profile?.avatar_url;

  const initials = `${name} ${lastName}`
    .trim()
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
              <div className="h-20 w-20 rounded-full bg-muted" />
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
      <div className="max-w-lg mx-auto py-10 px-4">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-accent text-accent-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">{name} {lastName}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </p>
          </CardHeader>
          <Separator />
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