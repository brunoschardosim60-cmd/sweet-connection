CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minisite_id uuid NOT NULL REFERENCES public.minisites(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora text NOT NULL,
  servico text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmado',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agendamentos_slot_unico
  ON public.agendamentos (minisite_id, data, hora)
  WHERE status = 'confirmado';

CREATE INDEX agendamentos_minisite_data ON public.agendamentos (minisite_id, data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY agendamentos_owner_all ON public.agendamentos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.minisites m WHERE m.id = agendamentos.minisite_id AND m.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.minisites m WHERE m.id = agendamentos.minisite_id AND m.owner_id = auth.uid()));

CREATE POLICY agendamentos_admin_read ON public.agendamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.nexa_agenda_ocupados(requested_slug text, requested_data date)
RETURNS TABLE(hora text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.hora
  FROM public.agendamentos a
  JOIN public.minisites m ON m.id = a.minisite_id
  WHERE m.slug = requested_slug
    AND m.status = 'publicado'
    AND a.data = requested_data
    AND a.status = 'confirmado';
$$;

CREATE OR REPLACE FUNCTION public.nexa_agendar(
  requested_slug text,
  requested_data date,
  requested_hora text,
  requested_nome text,
  requested_telefone text,
  requested_servico text DEFAULT '',
  requested_observacao text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  site_id uuid;
  novo public.agendamentos;
BEGIN
  SELECT m.id INTO site_id
  FROM public.minisites m
  WHERE m.slug = requested_slug AND m.status = 'publicado';

  IF site_id IS NULL THEN
    RAISE EXCEPTION 'minisite_indisponivel';
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

  INSERT INTO public.agendamentos (minisite_id, data, hora, servico, nome, telefone, observacao)
  VALUES (
    site_id,
    requested_data,
    requested_hora,
    left(coalesce(requested_servico, ''), 120),
    left(trim(requested_nome), 120),
    left(coalesce(requested_telefone, ''), 40),
    left(coalesce(requested_observacao, ''), 400)
  )
  RETURNING * INTO novo;

  RETURN jsonb_build_object('id', novo.id, 'data', novo.data, 'hora', novo.hora);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'horario_ocupado';
END;
$$;

GRANT EXECUTE ON FUNCTION public.nexa_agenda_ocupados(text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nexa_agendar(text, date, text, text, text, text, text) TO anon, authenticated;