ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS data_original date,
  ADD COLUMN IF NOT EXISTS hora_original text,
  ADD COLUMN IF NOT EXISTS reagendamentos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reagendado_em timestamp with time zone;

CREATE OR REPLACE FUNCTION public.track_agendamento_reagendamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.data IS DISTINCT FROM OLD.data OR NEW.hora IS DISTINCT FROM OLD.hora THEN
    IF OLD.data_original IS NULL THEN
      NEW.data_original := OLD.data;
      NEW.hora_original := OLD.hora;
    END IF;
    NEW.reagendamentos := COALESCE(OLD.reagendamentos, 0) + 1;
    NEW.reagendado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agendamentos_reagendamento ON public.agendamentos;
CREATE TRIGGER trg_agendamentos_reagendamento
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.track_agendamento_reagendamento();