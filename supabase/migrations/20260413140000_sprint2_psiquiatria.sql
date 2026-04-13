-- ============================================================
-- Sprint 2 — Contenção, Evolução, Escalas, Plano de Segurança,
--            Prescrição SOS, Reconciliação
-- Data: 2026-04-13
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONTENÇÃO (física/química) — ANVISA RDC 102/2000, CFM 1598
-- ------------------------------------------------------------
CREATE TABLE public.contencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('fisica','quimica','ambiental')),
  motivo text NOT NULL,
  descricao_metodo text NOT NULL,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  prescritor_id uuid REFERENCES auth.users(id),
  crm_prescritor text,
  executor_id uuid REFERENCES auth.users(id),
  medicamento_id uuid REFERENCES public.medicamentos(id),
  dose text,
  via text,
  reavaliacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  liberacao_motivo text,
  intercorrencias text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cont_paciente ON public.contencoes(paciente_id, inicio DESC);
CREATE INDEX idx_cont_ativas ON public.contencoes(paciente_id) WHERE fim IS NULL;
ALTER TABLE public.contencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read contencoes" ON public.contencoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Clinico write contencoes" ON public.contencoes FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'farmaceutico'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'farmaceutico'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 2. EVOLUÇÃO DE ENFERMAGEM (SAE)
-- ------------------------------------------------------------
CREATE TABLE public.evolucoes_enfermagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  enfermeiro_id uuid NOT NULL REFERENCES auth.users(id),
  turno text NOT NULL CHECK (turno IN ('M','T','N')),
  data_ref date NOT NULL DEFAULT CURRENT_DATE,
  -- SAE: exame, diagnóstico, plano, implementação, avaliação
  exame_fisico text DEFAULT '',
  queixas text DEFAULT '',
  sinais_vitais jsonb DEFAULT '{}'::jsonb,
  diagnosticos_enfermagem text[] DEFAULT '{}',
  intervencoes text[] DEFAULT '{}',
  resposta_terapeutica text DEFAULT '',
  intercorrencias text DEFAULT '',
  comportamento text DEFAULT '',
  risco_suicida text CHECK (risco_suicida IN ('baixo','moderado','alto')),
  risco_queda text CHECK (risco_queda IN ('baixo','moderado','alto')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(paciente_id, data_ref, turno, enfermeiro_id)
);
CREATE INDEX idx_evol_paciente ON public.evolucoes_enfermagem(paciente_id, data_ref DESC);
ALTER TABLE public.evolucoes_enfermagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read evolucoes" ON public.evolucoes_enfermagem FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Enf write evolucoes" ON public.evolucoes_enfermagem FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'enfermeiro')
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 3. ESCALAS PSIQUIÁTRICAS (PANSS, HAM-D, BDI, YMRS, AIMS, HAM-A)
-- ------------------------------------------------------------
CREATE TABLE public.escalas_psiquiatricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  avaliador_id uuid NOT NULL REFERENCES auth.users(id),
  escala text NOT NULL CHECK (escala IN ('PANSS','HAMD','BDI','YMRS','AIMS','HAMA','MMSE')),
  data_aplicacao timestamptz NOT NULL DEFAULT now(),
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "item1": 3, "item2": 5 }
  escore_total numeric,
  classificacao text,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_escala_paciente ON public.escalas_psiquiatricas(paciente_id, escala, data_aplicacao DESC);
ALTER TABLE public.escalas_psiquiatricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read escalas" ON public.escalas_psiquiatricas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Clinico write escalas" ON public.escalas_psiquiatricas FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 4. PLANO DE SEGURANÇA (Stanley-Brown)
-- ------------------------------------------------------------
CREATE TABLE public.planos_seguranca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  elaborador_id uuid NOT NULL REFERENCES auth.users(id),
  gatilhos text[] DEFAULT '{}',
  sinais_alerta text[] DEFAULT '{}',
  estrategias_internas text[] DEFAULT '{}',
  contatos_apoio jsonb DEFAULT '[]'::jsonb,  -- [{nome, telefone, relacao}]
  profissionais_contato jsonb DEFAULT '[]'::jsonb,
  recursos_emergencia text[] DEFAULT '{}',
  acoes_ambiente text DEFAULT '',  -- retirar objetos, restringir acesso
  ativo boolean NOT NULL DEFAULT true,
  revisao_em date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_plano_paciente ON public.planos_seguranca(paciente_id) WHERE ativo = true;
ALTER TABLE public.planos_seguranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read planos" ON public.planos_seguranca FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Clinico write planos" ON public.planos_seguranca FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 5. PRESCRIÇÃO "SE NECESSÁRIO" (SOS) — flag em itens_prescricao
-- ------------------------------------------------------------
ALTER TABLE public.itens_prescricao
  ADD COLUMN IF NOT EXISTS se_necessario boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gatilho text DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_doses_24h integer,
  ADD COLUMN IF NOT EXISTS intervalo_min_horas integer;

-- Registra condição clínica no momento da administração SOS
ALTER TABLE public.administracoes_mar
  ADD COLUMN IF NOT EXISTS condicao_sos text,
  ADD COLUMN IF NOT EXISTS escala_dor integer CHECK (escala_dor IS NULL OR (escala_dor BETWEEN 0 AND 10)),
  ADD COLUMN IF NOT EXISTS agitacao_rass integer CHECK (agitacao_rass IS NULL OR (agitacao_rass BETWEEN -5 AND 4));

-- ------------------------------------------------------------
-- 6. RECONCILIAÇÃO MEDICAMENTOSA (JCI IPSG.3)
-- ------------------------------------------------------------
CREATE TABLE public.reconciliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  momento text NOT NULL CHECK (momento IN ('admissao','transferencia','alta')),
  responsavel_id uuid NOT NULL REFERENCES auth.users(id),
  medicamentos_previos jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{nome, dose, via, freq, fonte}]
  medicamentos_atuais jsonb NOT NULL DEFAULT '[]'::jsonb,
  discrepancias jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{tipo: omissao|duplicidade|dose, item, acao}]
  conciliado boolean NOT NULL DEFAULT false,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_paciente ON public.reconciliacoes(paciente_id, created_at DESC);
ALTER TABLE public.reconciliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read reconciliacoes" ON public.reconciliacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Farm write reconciliacoes" ON public.reconciliacoes FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'farmaceutico') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    (has_role(auth.uid(),'farmaceutico') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 7. VIEWS de apoio
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_contencoes_ativas AS
SELECT c.*, p.nome AS paciente_nome, p.prontuario
FROM public.contencoes c
JOIN public.pacientes p ON p.id = c.paciente_id
WHERE c.fim IS NULL;
