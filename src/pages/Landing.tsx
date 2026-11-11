import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import { handleError } from "@/lib/errors";

type View = "login" | "signup" | "forgot";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  username: z.string().trim().min(1, "O nome é obrigatório"),
  last_name: z.string().trim().min(1, "O sobrenome é obrigatório"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const forgotSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

const Landing = () => {
  const { session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  

  const [view, setView] = useState<View>(inviteToken ? "signup" : "login");
  const [signingIn, setSigningIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Invite data
  const [inviteData, setInviteData] = useState<{ email?: string; role?: string; training_title?: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

  // Fetch invite data when token present
  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        const { data: rows } = await supabase.rpc("get_invitation_by_token", { _token: inviteToken });
        const data = rows?.[0];

        if (data) {
          const isRealEmail = data.email && !data.email.startsWith("link-") && !data.email.startsWith("import-");
          if (isRealEmail) setEmail(data.email);

          setInviteData({
            email: isRealEmail ? data.email : undefined,
            role: data.role,
            training_title: data.training_title ?? undefined,
          });
        } else {
          setError("Este convite não é válido ou já foi utilizado.");
        }
      } catch {
        setError("Erro ao verificar convite.");
      } finally {
        setInviteLoading(false);
      }
    })();
  }, [inviteToken]);

  if (loading || inviteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/lobby" replace />;
  }

  const clearForm = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    setUsername("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const switchView = (v: View) => {
    clearForm();
    setView(v);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
      setSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    try {
      if (view === "login") {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
          setFieldErrors(errs);
          return;
        }
        setSubmitting(true);
        await signInWithEmail(email, password);
      } else if (view === "signup") {
        const result = signupSchema.safeParse({ username, last_name, email, password, confirmPassword });
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
          setFieldErrors(errs);
          return;
        }

        setSubmitting(true);

        // If no invite token, check by email
        if (!inviteToken) {
          const { data: invitation } = await supabase.rpc("has_pending_invitation", {
            _email: email.trim().toLowerCase(),
          });

          if (!invitation) {
            setError("Este email não possui um convite válido. Solicite um convite ao administrador.");
            setSubmitting(false);
            return;
          }
        }

        // Pass invite_token in metadata so handle_new_user can match link-based invites
        const extraMeta: Record<string, string> = {};
        if (inviteToken) extraMeta.invite_token = inviteToken;

        const { confirmEmail } = await signUpWithEmail(email, password, username, last_name, Object.keys(extraMeta).length > 0 ? extraMeta : undefined);
        if (confirmEmail) {
          // Volta para o login mantendo o email preenchido
          setUsername("");
          setLastName("");
          setPassword("");
          setConfirmPassword("");
          setView("login");
          setSuccess("Conta criada! Verifique seu email para confirmar o cadastro e depois faça login.");
        }
      } else {
        const result = forgotSchema.safeParse({ email });
        if (!result.success) {
          const errs: Record<string, string> = {};
          result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
          setFieldErrors(errs);
          return;
        }
        setSubmitting(true);
        await resetPassword(email);
        setSuccess("Email enviado! Verifique sua caixa de entrada para redefinir a senha.");
      }
    } catch (err: unknown) {
      handleError(err, setError);
      
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="space-y-3">
          <img src={logo} alt="Treina in Box" className="mx-auto h-14 w-14 rounded-xl" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Treina in Box
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Plataforma de treinamento para facilitadores e equipes.
          </p>
        </div>

        {/* Invite banner */}
        {inviteData && (
          <Alert className="text-left border-primary/30 bg-primary/5">
            <Mail className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              Você foi convidado como <strong className="capitalize">{inviteData.role === "student" ? "Aluno" : inviteData.role === "mentor" ? "Mentor" : inviteData.role}</strong>
              {inviteData.training_title && <> para o treinamento <strong>{inviteData.training_title}</strong></>}.
              Crie sua conta para começar.
            </AlertDescription>
          </Alert>
        )}

        {/* Google OAuth */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={signingIn || submitting}
          variant="outline"
          className="w-full h-11 text-sm font-medium"
          size="lg"
        >
          {signingIn ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Entrar com Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="text-left border-primary/30 bg-primary/5">
            <Mail className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">{success}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        {(!success || view === "login") && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {view === "forgot" && (
              <button
                type="button"
                onClick={() => switchView("login")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </button>
            )}

            {view === "signup" && (
              <div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Nome</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
                {fieldErrors.username && (
                  <p className="text-xs text-destructive">{fieldErrors.username}</p>
                )}
              </div>
              <div>
                
              <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={last_name}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                  autoComplete="name"
                  />
                {fieldErrors.last_name && (
                  <p className="text-xs text-destructive">{fieldErrors.last_name}</p>
                )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {view !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={view === "login" ? "current-password" : "new-password"}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
              </div>
            )}

            {view === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 text-sm font-medium"
              size="lg"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {view === "login" && "Entrar"}
              {view === "signup" && "Criar conta"}
              {view === "forgot" && "Enviar link de recuperação"}
            </Button>

            {/* View switch links */}
            {view === "login" && !inviteToken && (
              <div className="space-y-2 text-center text-sm">
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Esqueceu a senha?
                </button>
                <p className="text-muted-foreground">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchView("signup")}
                    className="text-primary font-medium hover:underline"
                  >
                    Cadastre-se
                  </button>
                </p>
              </div>
            )}

            {view === "signup" && !inviteToken && (
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Entrar
                </button>
              </p>
            )}

            {inviteToken && view === "signup" && (
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Entrar
                </button>
              </p>
            )}
          </form>
        )}

        {success && view !== "login" && (
          <Button
            variant="outline"
            onClick={() => { clearForm(); setView("login"); }}
            className="w-full"
          >
            Voltar ao login
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Ao entrar, você aceita os nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>
    </div>
  );
};

export default Landing;
