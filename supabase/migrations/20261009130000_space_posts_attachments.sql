-- Anexos nas anotações do Meu Espaço: lista de { url, name, type, size }
ALTER TABLE public.space_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
