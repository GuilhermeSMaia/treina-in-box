-- Conteúdo vinculado opcionalmente a uma aula (sessão do Ao Vivo).
-- NULL = conteúdo sem aula (ex.: publicado antes da aula ser criada).
ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS content_posts_training_session_idx
  ON public.content_posts (training_id, session_id);