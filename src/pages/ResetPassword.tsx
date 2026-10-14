import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Box } from "lucide-react";
import { z } from "zod";

const resetSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const nameSchema = z.object({
  username: z.string().trim().min(1, "Informe seu nome"),
  last_name: z.string().trim().min(1, "Informe seu sobrenome"),
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Usuário chegou pelo email de convite (inviteUserByEmail): define nome e senha
  const isInvite = searchParams.has("convite");
  const [username, setUsername] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validToken, setValidToken] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
        setChecking(false);
      }
    });

    // Also check current session from hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Após ativar a conta pelo convite, redireciona automaticamente
  useEffect(() => {
    if (!success || !isInvite) return;
    const timer = setTimeout(() => navigate("/", { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [success, isInvite, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errs: Record<string, string> = {};
    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
    }
    if (isInvite) {
      const nameResult = nameSchema.safeParse({ username, last_name: lastName });
      if (!nameResult.success) {
        nameResult.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
      }
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.updateUser(
        isInvite
          ? { password, data: { username: username.trim(), last_name: lastName.trim() } }
          : { password }
      );
      if (error) throw error;

      if (isInvite && data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ username: username.trim(), last_name: lastName.trim() })
          .eq("user_id", data.user.id);
        if (profileError) throw profileError;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao redefinir a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Box className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isInvite ? "Ative sua conta" : "Redefinir senha"}
          </h1>
        </div>

        {!validToken && !success && (
          <div className="space-y-4">
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isInvite
                  ? "Link de convite inválido ou expirado. Peça um novo convite ao administrador."
                  : "Link inválido ou expirado. Solicite um novo link de recuperação."}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/")} className="w-full">
              Voltar ao login
            </Button>
          </div>
        )}

        {validToken && !success && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isInvite && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Nome</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="given-name"
                  />
                  {fieldErrors.username && (
                    <p className="text-xs text-destructive">{fieldErrors.username}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                  {fieldErrors.last_name && (
                    <p className="text-xs text-destructive">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">{isInvite ? "Senha" : "Nova senha"}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{isInvite ? "Confirmar senha" : "Confirmar nova senha"}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11" size="lg">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isInvite ? "Ativar conta" : "Redefinir senha"}
            </Button>
          </form>
        )}

        {success && (
          <div className="space-y-4">
            <Alert className="text-left border-primary/30 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                {isInvite ? "Conta ativada com sucesso!" : "Senha redefinida com sucesso!"}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/lobby")} className="w-full">
              Ir para o Lobby
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
