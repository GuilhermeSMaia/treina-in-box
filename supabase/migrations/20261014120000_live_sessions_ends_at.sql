-- Horário de término da aula ao vivo, definido pelo professor.
-- A aula fica "ao vivo" entre scheduled_at (início) e ends_at (fim).
-- NULL = aula antiga, sem fim definido (o app usa uma janela padrão a partir do início).
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_ends_after_start;

ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_ends_after_start
  CHECK (ends_at IS NULL OR (scheduled_at IS NOT NULL AND ends_at > scheduled_at));
