-- ============================================================
-- Migration: Features psiquiátricas + Portaria 344/98 + LGPD
-- Data: 2026-04-13
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONSENTIMENTO LGPD (Art. 11 — dados sensíveis de saúde)
-- ------------------------------------------------------------
CREATE TABLE public.consentimentos_lgpd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  finalidade text NOT NULL CHECK (finalidade IN (
    'tratamento_medico', 'dispensacao_medicamento', 'pesquisa_cientifica',
    'faturamento', 'auditoria_regulatoria', 'compartilhamento_parceiro'
  )),
  base_legal text NOT NULL DEFAULT 'tutela_saude' CHECK (base_legal IN (
    'consentimento', 'tutela_saude', 'obrigacao_legal', 'politica_publica'
  )),
  concedido boolean NOT NULL,
  concedido_por text NOT NULL,
  concedido_por_cpf text,
  concedido_em timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz,
  documento_url text,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_paciente ON public.consentimentos_lgpd(paciente_id);
ALTER TABLE public.consentimentos_lgpd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read consent"
  ON public.consentimentos_lgpd FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));

CREATE POLICY "Staff write consent"
  ON public.consentimentos_lgpd FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmaceutico') OR has_role(auth.uid(), 'enfermeiro'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- Pedidos de expurgo / direito ao esquecimento (Art. 18 LGPD)
CREATE TABLE public.pedidos_expurgo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  solicitante_nome text NOT NULL,
  solicitante_documento text NOT NULL,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_analise','aprovado','rejeitado','executado')),
  parecer_juridico text,
  executado_em timestamptz,
  aprovador_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos_expurgo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage expurgo" ON public.pedidos_expurgo FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 2. ALERGIAS E CONTRAINDICAÇÕES (estruturado)
-- ------------------------------------------------------------
CREATE TABLE public.alergias_paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('medicamento','alimento','latex','outro')),
  agente text NOT NULL,
  principio_ativo text,
  severidade text NOT NULL CHECK (severidade IN ('leve','moderada','grave','anafilatica')),
  reacao text DEFAULT '',
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alergia_paciente ON public.alergias_paciente(paciente_id);
CREATE INDEX idx_alergia_principio ON public.alergias_paciente(principio_ativo);
ALTER TABLE public.alergias_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read alergias" ON public.alergias_paciente FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Staff write alergias" ON public.alergias_paciente FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'farmaceutico') OR has_role(auth.uid(),'enfermeiro'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  )
  WITH CHECK (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'farmaceutico') OR has_role(auth.uid(),'enfermeiro'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- Interações medicamentosas (base seed manual — em prod integrar Memed/API)
CREATE TABLE public.interacoes_medicamentosas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principio_a text NOT NULL,
  principio_b text NOT NULL,
  severidade text NOT NULL CHECK (severidade IN ('leve','moderada','grave','contraindicada')),
  descricao text NOT NULL,
  referencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(principio_a, principio_b)
);
ALTER TABLE public.interacoes_medicamentosas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read interacoes" ON public.interacoes_medicamentosas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write interacoes" ON public.interacoes_medicamentosas FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Seed comum em psiquiatria (amostra — expandir via CSV oficial)
INSERT INTO public.interacoes_medicamentosas (principio_a, principio_b, severidade, descricao, referencia) VALUES
  ('clozapina','carbamazepina','contraindicada','Risco de agranulocitose aditiva','ANVISA Bulário'),
  ('lítio','aine','grave','AINEs reduzem clearance de lítio — risco de intoxicação','Stockley’s'),
  ('imao','isrs','contraindicada','Síndrome serotoninérgica — aguardar washout','Stockley’s'),
  ('haloperidol','metadona','grave','Prolongamento de QT — risco de torsades','FDA'),
  ('benzodiazepinico','opioide','grave','Depressão respiratória aditiva','FDA Black Box'),
  ('quetiapina','fluconazol','moderada','Aumento de AUC da quetiapina','Stockley’s')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. PORTARIA 344/98 — Controle de substâncias sujeitas a controle especial
-- ------------------------------------------------------------
ALTER TABLE public.medicamentos
  ADD COLUMN IF NOT EXISTS lista_controlada text
    CHECK (lista_controlada IN ('A1','A2','A3','B1','B2','C1','C2','C3','C4','C5')),
  ADD COLUMN IF NOT EXISTS dcb_codigo text,
  ADD COLUMN IF NOT EXISTS registro_anvisa text;

-- Livro de registro específico de controlados (inalterável)
CREATE TABLE public.registro_controlados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL REFERENCES public.filiais(id),
  medicamento_id uuid NOT NULL REFERENCES public.medicamentos(id),
  lote_id uuid REFERENCES public.lotes(id),
  tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('entrada','saida','perda','devolucao','transferencia')),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  saldo_pos integer NOT NULL,
  prescricao_id uuid REFERENCES public.prescricoes(id),
  paciente_id uuid REFERENCES public.pacientes(id),
  nota_fiscal text,
  numero_notificacao_receita text,
  farmaceutico_id uuid NOT NULL REFERENCES auth.users(id),
  conferente_id uuid REFERENCES auth.users(id),
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rc_filial_med ON public.registro_controlados(filial_id, medicamento_id, created_at);
CREATE INDEX idx_rc_prescricao ON public.registro_controlados(prescricao_id);
ALTER TABLE public.registro_controlados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read rc" ON public.registro_controlados FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));
CREATE POLICY "Farm insert rc" ON public.registro_controlados FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'farmaceutico') AND is_own_filial(auth.uid(), filial_id));
-- Sem UPDATE/DELETE: livro é append-only (exigência regulatória)

-- View BMPO (Balanço Mensal de Psicotrópicos e Entorpecentes)
CREATE OR REPLACE VIEW public.v_bmpo AS
SELECT
  filial_id,
  medicamento_id,
  m.nome AS medicamento_nome,
  m.lista_controlada,
  m.dcb_codigo,
  date_trunc('month', rc.created_at)::date AS mes_referencia,
  SUM(CASE WHEN tipo_movimento = 'entrada' THEN quantidade ELSE 0 END) AS total_entradas,
  SUM(CASE WHEN tipo_movimento = 'saida' THEN quantidade ELSE 0 END) AS total_saidas,
  SUM(CASE WHEN tipo_movimento = 'perda' THEN quantidade ELSE 0 END) AS total_perdas,
  SUM(CASE WHEN tipo_movimento = 'devolucao' THEN quantidade ELSE 0 END) AS total_devolucoes
FROM public.registro_controlados rc
JOIN public.medicamentos m ON m.id = rc.medicamento_id
WHERE m.lista_controlada IS NOT NULL
GROUP BY filial_id, medicamento_id, m.nome, m.lista_controlada, m.dcb_codigo, date_trunc('month', rc.created_at);

-- ------------------------------------------------------------
-- 4. ADMINISTRAÇÃO À BEIRA-LEITO (MAR — Medication Administration Record)
-- ------------------------------------------------------------
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS codigo_pulseira text UNIQUE,
  ADD COLUMN IF NOT EXISTS risco_suicida text CHECK (risco_suicida IN ('baixo','moderado','alto')),
  ADD COLUMN IF NOT EXISTS em_contencao boolean DEFAULT false;

CREATE TABLE public.administracoes_mar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescricao_id uuid NOT NULL REFERENCES public.prescricoes(id),
  item_prescricao_id uuid NOT NULL REFERENCES public.itens_prescricao(id),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  medicamento_id uuid NOT NULL REFERENCES public.medicamentos(id),
  lote_id uuid REFERENCES public.lotes(id),
  dose_administrada text NOT NULL,
  via text NOT NULL,
  horario_previsto timestamptz NOT NULL,
  horario_administrado timestamptz NOT NULL DEFAULT now(),
  enfermeiro_id uuid NOT NULL REFERENCES auth.users(id),
  conferente_id uuid REFERENCES auth.users(id),
  barcode_paciente_scan boolean NOT NULL DEFAULT false,
  barcode_medicamento_scan boolean NOT NULL DEFAULT false,
  recusado boolean NOT NULL DEFAULT false,
  motivo_recusa text,
  reacao_adversa text,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mar_paciente_data ON public.administracoes_mar(paciente_id, horario_administrado);
CREATE INDEX idx_mar_prescricao ON public.administracoes_mar(prescricao_id);
ALTER TABLE public.administracoes_mar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enf read MAR" ON public.administracoes_mar FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Enf write MAR" ON public.administracoes_mar FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'farmaceutico'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 5. C-SSRS — Columbia Suicide Severity Rating Scale
-- ------------------------------------------------------------
CREATE TABLE public.avaliacoes_cssrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  avaliador_id uuid NOT NULL REFERENCES auth.users(id),
  data_avaliacao timestamptz NOT NULL DEFAULT now(),
  q1_desejo_morto boolean NOT NULL,
  q2_ideacao_suicida boolean NOT NULL,
  q3_ideacao_com_metodo boolean NOT NULL,
  q4_ideacao_com_intencao boolean NOT NULL,
  q5_ideacao_com_plano boolean NOT NULL,
  q6_comportamento_30d boolean NOT NULL,
  q6_comportamento_vida boolean NOT NULL,
  risco text NOT NULL CHECK (risco IN ('baixo','moderado','alto')),
  conduta text DEFAULT '',
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cssrs_paciente ON public.avaliacoes_cssrs(paciente_id, data_avaliacao DESC);
ALTER TABLE public.avaliacoes_cssrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read cssrs" ON public.avaliacoes_cssrs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id)));
CREATE POLICY "Clinico write cssrs" ON public.avaliacoes_cssrs FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(),'enfermeiro') OR has_role(auth.uid(),'farmaceutico') OR has_role(auth.uid(),'admin'))
    AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = paciente_id AND is_own_filial(auth.uid(), p.filial_id))
  );

-- ------------------------------------------------------------
-- 6. AUDITORIA IMUTÁVEL (hash encadeado — evidência forense)
-- ------------------------------------------------------------
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS row_hash text;

CREATE OR REPLACE FUNCTION public.audit_hash_chain()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  last_hash text;
BEGIN
  SELECT row_hash INTO last_hash FROM public.audit_log ORDER BY created_at DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, '');
  NEW.row_hash := encode(
    digest(
      COALESCE(NEW.prev_hash,'') ||
      COALESCE(NEW.usuario_id::text,'') ||
      COALESCE(NEW.acao,'') ||
      COALESCE(NEW.tabela,'') ||
      COALESCE(NEW.registro_id::text,'') ||
      COALESCE(NEW.dados_novos::text,'') ||
      COALESCE(NEW.created_at::text, now()::text),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_hash ON public.audit_log;
CREATE TRIGGER trg_audit_hash
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_hash_chain();

-- Revoga UPDATE/DELETE para garantir imutabilidade
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon;

-- ------------------------------------------------------------
-- 7. PREVISÃO DE RUPTURA DE ESTOQUE (view baseada em CMM)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_previsao_ruptura AS
SELECT
  m.id AS medicamento_id,
  m.nome,
  COALESCE(SUM(l.quantidade_atual), 0) AS estoque_atual,
  m.estoque_minimo,
  COALESCE((
    SELECT SUM(quantidade) FROM movimentacoes mv
    WHERE mv.medicamento_id = m.id
      AND mv.tipo IN ('saida','dispensacao')
      AND mv.created_at >= now() - interval '90 days'
  ), 0) / 90.0 AS consumo_dia,
  CASE
    WHEN COALESCE((
      SELECT SUM(quantidade) FROM movimentacoes mv
      WHERE mv.medicamento_id = m.id
        AND mv.tipo IN ('saida','dispensacao')
        AND mv.created_at >= now() - interval '90 days'
    ), 0) = 0 THEN NULL
    ELSE (COALESCE(SUM(l.quantidade_atual),0) / NULLIF((
      SELECT SUM(quantidade) FROM movimentacoes mv
      WHERE mv.medicamento_id = m.id
        AND mv.tipo IN ('saida','dispensacao')
        AND mv.created_at >= now() - interval '90 days'
    ), 0) * 90.0)
  END AS dias_cobertura
FROM public.medicamentos m
LEFT JOIN public.lotes l ON l.medicamento_id = m.id AND l.ativo = true
WHERE m.ativo = true
GROUP BY m.id, m.nome, m.estoque_minimo;
