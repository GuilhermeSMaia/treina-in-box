-- =====================================================================
-- Correção do cadastro e dos convites
-- 1) handle_new_user: as versões anteriores inseriam só "id" em profiles,
--    mas profiles.user_id é NOT NULL -> todo cadastro novo falhava.
-- 2) Remove a policy que deixava qualquer pessoa (anon) listar todos os
--    convites pendentes (emails + tokens) e a troca por funções seguras.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_count int;
  _invitation record;
BEGIN
  SELECT count(*) INTO _user_count FROM public.profiles;

  INSERT INTO public.profiles (user_id, username, last_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF _user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  ELSE
    -- 1) convite pelo email
    SELECT * INTO _invitation FROM public.invitations
      WHERE lower(email) = lower(NEW.email)
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1;

    -- 2) convite pelo token (links e WhatsApp)
    IF _invitation IS NULL THEN
      SELECT * INTO _invitation FROM public.invitations
        WHERE invite_token = (NEW.raw_user_meta_data->>'invite_token')
          AND status = 'pending'
        LIMIT 1;
    END IF;

    IF _invitation IS NULL THEN
      UPDATE public.profiles SET enrollment_status = 'blocked' WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invitation.role)
      ON CONFLICT DO NOTHING;
      UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;

      IF _invitation.training_id IS NOT NULL THEN
        INSERT INTO public.training_enrollments (user_id, training_id, class_id)
        VALUES (NEW.id, _invitation.training_id, _invitation.class_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- Consulta segura de convites para quem ainda não tem conta (anon)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can check pending invitations by email" ON public.invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (email text, role public.app_role, training_title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.email, i.role, t.title
  FROM public.invitations i
  LEFT JOIN public.trainings t ON t.id = i.training_id
  WHERE i.invite_token = _token
    AND i.status = 'pending'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_pending_invitation(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invitations
    WHERE lower(email) = lower(trim(_email))
      AND status = 'pending'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_invitation(text) TO anon, authenticated;
