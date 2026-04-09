
-- Tabela para registrar checklist de administração de medicação
CREATE TABLE public.checklist_medicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescricao_id uuid NOT NULL REFERENCES public.prescricoes(id) ON DELETE CASCADE,
  item_prescricao_id uuid NOT NULL REFERENCES public.itens_prescricao(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  turno text NOT NULL CHECK (turno IN ('M', 'T', 'N')),
  administrado boolean NOT NULL DEFAULT false,
  enfermeiro_id uuid REFERENCES auth.users(id),
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_prescricao_id, data, turno)
);

ALTER TABLE public.checklist_medicacao ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX idx_checklist_prescricao ON public.checklist_medicacao(prescricao_id);
CREATE INDEX idx_checklist_item_data ON public.checklist_medicacao(item_prescricao_id, data);

-- RLS: leitura por filial
CREATE POLICY "Auth read checklist"
  ON public.checklist_medicacao FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prescricoes p
      WHERE p.id = checklist_medicacao.prescricao_id
        AND is_own_filial(auth.uid(), p.filial_id)
    )
  );

-- RLS: enfermeiro pode inserir/atualizar
CREATE POLICY "Enf manage checklist"
  ON public.checklist_medicacao FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'enfermeiro') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'enfermeiro') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- RLS: farmacêutico pode gerenciar
CREATE POLICY "Farm manage checklist"
  ON public.checklist_medicacao FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'farmaceutico') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'farmaceutico') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- RLS: admin pode gerenciar
CREATE POLICY "Admin manage checklist"
  ON public.checklist_medicacao FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') AND
    EXISTS (SELECT 1 FROM prescricoes p WHERE p.id = checklist_medicacao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- Trigger updated_at
CREATE TRIGGER update_checklist_medicacao_updated_at
  BEFORE UPDATE ON public.checklist_medicacao
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
