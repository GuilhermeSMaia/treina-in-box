-- =====================================================================
-- Praça estilo WhatsApp: respostas, mensagens fixadas e reações
-- =====================================================================

ALTER TABLE public.plaza_posts
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.plaza_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid;

CREATE INDEX IF NOT EXISTS plaza_posts_reply_to_idx ON public.plaza_posts (reply_to_id);
CREATE INDEX IF NOT EXISTS plaza_posts_pinned_idx
  ON public.plaza_posts (training_id) WHERE pinned_at IS NOT NULL;

-- Só moderadores fixam/desafixam; a resposta não muda depois de criada;
-- fixar não conta como "editada". O nome começa com "zz_" para rodar
-- depois do trigger de updated_at.
CREATE OR REPLACE FUNCTION public.plaza_posts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_mod boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / SQL editor
  END IF;

  _is_mod := public.has_role(auth.uid(), 'owner')
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'mentor');

  IF TG_OP = 'INSERT' THEN
    IF NOT _is_mod THEN
      NEW.pinned_at := NULL;
      NEW.pinned_by := NULL;
    END IF;
  ELSE
    IF (NEW.pinned_at IS DISTINCT FROM OLD.pinned_at
        OR NEW.pinned_by IS DISTINCT FROM OLD.pinned_by) AND NOT _is_mod THEN
      RAISE EXCEPTION 'Apenas moderadores podem fixar mensagens' USING ERRCODE = '42501';
    END IF;

    NEW.reply_to_id := OLD.reply_to_id;

    IF NEW.content IS NOT DISTINCT FROM OLD.content
       AND NEW.attachments IS NOT DISTINCT FROM OLD.attachments THEN
      NEW.updated_at := OLD.updated_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_plaza_posts_guard ON public.plaza_posts;
CREATE TRIGGER zz_plaza_posts_guard
  BEFORE INSERT OR UPDATE ON public.plaza_posts
  FOR EACH ROW EXECUTE FUNCTION public.plaza_posts_guard();

-- Reações ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plaza_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.plaza_posts(id) ON DELETE CASCADE,
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS plaza_reactions_training_idx ON public.plaza_reactions (training_id);
CREATE INDEX IF NOT EXISTS plaza_reactions_post_idx ON public.plaza_reactions (post_id);

ALTER TABLE public.plaza_reactions ENABLE ROW LEVEL SECURITY;

-- O EXISTS respeita a RLS de plaza_posts: só vê reação quem vê a mensagem.
DROP POLICY IF EXISTS "View reactions of visible posts" ON public.plaza_reactions;
CREATE POLICY "View reactions of visible posts"
  ON public.plaza_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.plaza_posts p WHERE p.id = plaza_reactions.post_id));

DROP POLICY IF EXISTS "Users add own reactions" ON public.plaza_reactions;
CREATE POLICY "Users add own reactions"
  ON public.plaza_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.plaza_posts p
      WHERE p.id = plaza_reactions.post_id
        AND p.training_id = plaza_reactions.training_id
    )
  );

DROP POLICY IF EXISTS "Users remove own reactions" ON public.plaza_reactions;
CREATE POLICY "Users remove own reactions"
  ON public.plaza_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Realtime (DELETE com filtro precisa de REPLICA IDENTITY FULL)
ALTER TABLE public.plaza_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.plaza_posts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'plaza_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plaza_reactions;
  END IF;
END $$;
