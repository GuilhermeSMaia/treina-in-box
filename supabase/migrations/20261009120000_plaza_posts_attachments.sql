-- Anexos nas mensagens da Praça: lista de { url, name, type, size }
ALTER TABLE public.plaza_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
