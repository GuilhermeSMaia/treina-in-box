-- Anotações do Meu Espaço vinculadas a uma aula (sessão do Ao Vivo).
-- NULL = anotação geral. Se a aula for excluída, as anotações viram gerais.
ALTER TABLE public.space_posts
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS space_posts_training_session_idx
  ON public.space_posts (training_id, session_id);
