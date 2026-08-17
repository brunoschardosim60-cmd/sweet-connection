ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS chave_idempotencia text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS agendamentos_token_unico ON public.agendamentos (token);
CREATE UNIQUE INDEX IF NOT EXISTS agendamentos_chave_unica
  ON public.agendamentos (minisite_id, chave_idempotencia)
  WHERE chave_idempotencia IS NOT NULL;

DROP TRIGGER IF EXISTS agendamentos_updated_at ON public.agendamentos;
CREATE TRIGGER agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP FUNCTION IF EXISTS public.nexa_agendar(text, date, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.nexa_agendar(
  requested_slug text,
  requested_data date,
  requested_hora text,
  requested_nome text,
  requested_telefone text,
  requested_servico text DEFAULT '',
  requested_observacao text DEFAULT '',
  requested_chave text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_id uuid;
  novo public.agendamentos;
  chave text := nullif(left(coalesce(requested_chave, ''), 80), '');
BEGIN
  SELECT m.id INTO site_id
  FROM public.minisites m
  WHERE m.slug = lower(trim(requested_slug)) AND m.status = 'publicado';

  IF site_id IS NULL THEN
    RAISE EXCEPTION 'minisite_indisponivel';
  END IF;

  IF chave IS NOT NULL THEN
    SELECT * INTO novo FROM public.agendamentos a
    WHERE a.minisite_id = site_id AND a.chave_idempotencia = chave;
    IF FOUND THEN
      RETURN jsonb_build_object('id', novo.id, 'token', novo.token, 'data', novo.data,
        'hora', novo.hora, 'status', novo.status, 'repetido', true);
    END IF;
  END IF;

  IF requested_data < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'data_invalida';
  END IF;

  IF requested_hora !~ '^[0-2][0-9]:[0-5][0-9]$' THEN
    RAISE EXCEPTION 'hora_invalida';
  END IF;

  IF length(coalesce(trim(requested_nome), '')) < 2 THEN
    RAISE EXCEPTION 'nome_invalido';
  END IF;

  IF (
    SELECT count(*) FROM public.agendamentos a
    WHERE a.minisite_id = site_id
      AND a.created_at > now() - interval '1 hour'
      AND a.telefone = left(coalesce(requested_telefone, ''), 40)
  ) >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  BEGIN
    INSERT INTO public.agendamentos (
      minisite_id, data, hora, servico, nome, telefone, observacao, chave_idempotencia
    ) VALUES (
      site_id,
      requested_data,
      requested_hora,
      left(coalesce(requested_servico, ''), 120),
      left(trim(requested_nome), 120),
      left(coalesce(requested_telefone, ''), 40),
      left(coalesce(requested_observacao, ''), 400),
      chave
    ) RETURNING * INTO novo;
  EXCEPTION
    WHEN unique_violation THEN
      IF chave IS NOT NULL THEN
        SELECT * INTO novo FROM public.agendamentos a
        WHERE a.minisite_id = site_id AND a.chave_idempotencia = chave;
        IF FOUND THEN
          RETURN jsonb_build_object('id', novo.id, 'token', novo.token, 'data', novo.data,
            'hora', novo.hora, 'status', novo.status, 'repetido', true);
        END IF;
      END IF;
      RAISE EXCEPTION 'horario_ocupado';
  END;

  RETURN jsonb_build_object('id', novo.id, 'token', novo.token, 'data', novo.data,
    'hora', novo.hora, 'status', novo.status, 'repetido', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.nexa_agendamento_por_token(requested_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', a.id,
    'data', a.data,
    'hora', a.hora,
    'servico', a.servico,
    'nome', a.nome,
    'telefone', right(a.telefone, 4),
    'status', a.status,
    'slug', m.slug,
    'negocio', coalesce(m.published_content #>> '{conteudo,nome}', m.slug),
    'whatsapp', coalesce(m.published_content #>> '{conteudo,whatsapp}', '')
  )
  FROM public.agendamentos a
  JOIN public.minisites m ON m.id = a.minisite_id
  WHERE a.token = requested_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.nexa_cancelar_agendamento(requested_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  afetados int;
BEGIN
  UPDATE public.agendamentos
  SET status = 'cancelado'
  WHERE token = requested_token AND status = 'confirmado';
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nexa_agendar(text, date, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_agendamento_por_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_cancelar_agendamento(uuid) TO anon, authenticated;

ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;