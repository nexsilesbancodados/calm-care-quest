
-- Create prescricoes table
CREATE TABLE public.prescricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_receita text NOT NULL,
  paciente text NOT NULL,
  prontuario text,
  medico text NOT NULL,
  crm text,
  setor text,
  data_prescricao date NOT NULL DEFAULT CURRENT_DATE,
  validade_dias integer DEFAULT 30,
  status text DEFAULT 'ativa',
  observacao text DEFAULT '',
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger for status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_prescricao_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('ativa', 'parcialmente_dispensada', 'totalmente_dispensada', 'vencida', 'cancelada') THEN
    RAISE EXCEPTION 'Invalid prescricao status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_prescricao_status
  BEFORE INSERT OR UPDATE ON public.prescricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_prescricao_status();

-- Updated_at trigger for prescricoes
CREATE TRIGGER trg_prescricoes_updated_at
  BEFORE UPDATE ON public.prescricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create itens_prescricao table
CREATE TABLE public.itens_prescricao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescricao_id uuid REFERENCES public.prescricoes(id) ON DELETE CASCADE NOT NULL,
  medicamento_id uuid REFERENCES public.medicamentos(id) NOT NULL,
  quantidade_prescrita integer NOT NULL DEFAULT 0,
  quantidade_dispensada integer NOT NULL DEFAULT 0,
  posologia text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add prescricao_id to movimentacoes
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS prescricao_id uuid REFERENCES public.prescricoes(id);

-- RLS for prescricoes
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read prescricoes" ON public.prescricoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage prescricoes" ON public.prescricoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Farm manage prescricoes" ON public.prescricoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'farmaceutico'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'::app_role));

CREATE POLICY "Enf manage prescricoes" ON public.prescricoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'enfermeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'enfermeiro'::app_role));

-- RLS for itens_prescricao
ALTER TABLE public.itens_prescricao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read itens_prescricao" ON public.itens_prescricao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage itens_prescricao" ON public.itens_prescricao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Farm manage itens_prescricao" ON public.itens_prescricao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'farmaceutico'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'::app_role));

CREATE POLICY "Enf manage itens_prescricao" ON public.itens_prescricao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'enfermeiro'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'enfermeiro'::app_role));
