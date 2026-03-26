
-- 1. Tabela de notificações persistentes
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'system',
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  severidade text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  resolvida boolean NOT NULL DEFAULT false,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  medicamento_id uuid REFERENCES public.medicamentos(id) ON DELETE SET NULL,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  prescricao_id uuid REFERENCES public.prescricoes(id) ON DELETE SET NULL,
  link text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler notificações
CREATE POLICY "Auth read notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated USING (true);

-- Admins e farmacêuticos podem inserir
CREATE POLICY "Admin insert notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'farmaceutico')
  );

-- Usuários podem atualizar (marcar como lida/resolvida)
CREATE POLICY "Auth update notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Service role pode inserir (para edge functions)
CREATE POLICY "Service insert notificacoes" ON public.notificacoes
  FOR INSERT TO service_role WITH CHECK (true);

-- 2. Tabela de configuração de automações
CREATE TABLE public.automacao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  parametros jsonb NOT NULL DEFAULT '{}',
  ultima_execucao timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read automacao_config" ON public.automacao_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage automacao_config" ON public.automacao_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed automação configs
INSERT INTO public.automacao_config (tipo, ativo, parametros) VALUES
  ('alerta_estoque_baixo', true, '{"threshold_pct": 25}'),
  ('alerta_vencimento', true, '{"dias_antecedencia": 60}'),
  ('dispensacao_automatica', true, '{}'),
  ('relatorio_periodico', true, '{"frequencia": "semanal", "dia_semana": 1}');

-- 3. Função para verificar estoque baixo e gerar notificações
CREATE OR REPLACE FUNCTION public.check_estoque_baixo()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  count_alerts integer := 0;
BEGIN
  FOR rec IN
    SELECT m.id, m.nome, m.estoque_minimo,
           COALESCE(SUM(l.quantidade_atual), 0) AS total
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true AND m.estoque_minimo > 0
    GROUP BY m.id, m.nome, m.estoque_minimo
    HAVING COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo
  LOOP
    -- Evitar duplicatas nas últimas 24h
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes
      WHERE medicamento_id = rec.id
        AND tipo = 'estoque_baixo'
        AND resolvida = false
        AND created_at > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, medicamento_id, link)
      VALUES (
        'estoque_baixo',
        CASE
          WHEN rec.total = 0 THEN rec.nome || ' — ESGOTADO'
          WHEN rec.total <= rec.estoque_minimo * 0.25 THEN rec.nome || ' — Estoque CRÍTICO'
          ELSE rec.nome || ' — Estoque baixo'
        END,
        'Estoque atual: ' || rec.total || ' un. (mínimo: ' || rec.estoque_minimo || ')',
        CASE
          WHEN rec.total = 0 THEN 'critico'
          WHEN rec.total <= rec.estoque_minimo * 0.25 THEN 'alto'
          ELSE 'medio'
        END,
        rec.id,
        '/alertas'
      );
      count_alerts := count_alerts + 1;
    END IF;
  END LOOP;
  
  UPDATE automacao_config SET ultima_execucao = now() WHERE tipo = 'alerta_estoque_baixo';
  RETURN count_alerts;
END;
$$;

-- 4. Função para verificar lotes próximos do vencimento
CREATE OR REPLACE FUNCTION public.check_vencimento_lotes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  count_alerts integer := 0;
  cfg_dias integer;
BEGIN
  SELECT (parametros->>'dias_antecedencia')::integer INTO cfg_dias
  FROM automacao_config WHERE tipo = 'alerta_vencimento';
  cfg_dias := COALESCE(cfg_dias, 60);

  FOR rec IN
    SELECT l.id AS lote_id, l.numero_lote, l.validade, l.quantidade_atual,
           m.id AS med_id, m.nome,
           (l.validade - CURRENT_DATE) AS dias_restantes
    FROM lotes l
    JOIN medicamentos m ON m.id = l.medicamento_id
    WHERE l.ativo = true AND l.quantidade_atual > 0
      AND l.validade <= CURRENT_DATE + cfg_dias
    ORDER BY l.validade
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes
      WHERE lote_id = rec.lote_id
        AND tipo = 'vencimento'
        AND resolvida = false
        AND created_at > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, medicamento_id, lote_id, link)
      VALUES (
        'vencimento',
        CASE
          WHEN rec.dias_restantes <= 0 THEN rec.nome || ' — Lote VENCIDO'
          WHEN rec.dias_restantes <= 15 THEN rec.nome || ' — Vence em ' || rec.dias_restantes || ' dias'
          ELSE rec.nome || ' — Vence em ' || rec.dias_restantes || ' dias'
        END,
        'Lote ' || rec.numero_lote || ' — Val: ' || to_char(rec.validade, 'DD/MM/YYYY') || ' (' || rec.quantidade_atual || ' un.)',
        CASE
          WHEN rec.dias_restantes <= 0 THEN 'critico'
          WHEN rec.dias_restantes <= 15 THEN 'alto'
          ELSE 'medio'
        END,
        rec.med_id,
        rec.lote_id,
        '/alertas'
      );
      count_alerts := count_alerts + 1;
    END IF;
  END LOOP;
  
  UPDATE automacao_config SET ultima_execucao = now() WHERE tipo = 'alerta_vencimento';
  RETURN count_alerts;
END;
$$;

-- 5. Função para dispensação automática via prescrição (FEFO)
CREATE OR REPLACE FUNCTION public.dispensar_prescricao(_prescricao_id uuid, _usuario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item RECORD;
  lote RECORD;
  qtd_restante integer;
  qtd_dispensar integer;
  resultado jsonb := '[]'::jsonb;
  total_dispensado integer := 0;
BEGIN
  -- Verificar se prescrição existe e está ativa
  IF NOT EXISTS (SELECT 1 FROM prescricoes WHERE id = _prescricao_id AND status IN ('ativa', 'parcialmente_dispensada')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescrição não encontrada ou já dispensada');
  END IF;

  FOR item IN
    SELECT ip.id, ip.medicamento_id, ip.quantidade_prescrita, ip.quantidade_dispensada,
           m.nome AS med_nome
    FROM itens_prescricao ip
    JOIN medicamentos m ON m.id = ip.medicamento_id
    WHERE ip.prescricao_id = _prescricao_id
      AND ip.quantidade_dispensada < ip.quantidade_prescrita
  LOOP
    qtd_restante := item.quantidade_prescrita - item.quantidade_dispensada;
    
    -- FEFO: pegar lotes ordenados por validade
    FOR lote IN
      SELECT l.id, l.numero_lote, l.quantidade_atual
      FROM lotes l
      WHERE l.medicamento_id = item.medicamento_id
        AND l.ativo = true
        AND l.quantidade_atual > 0
        AND l.validade > CURRENT_DATE
      ORDER BY l.validade ASC
    LOOP
      EXIT WHEN qtd_restante <= 0;
      
      qtd_dispensar := LEAST(qtd_restante, lote.quantidade_atual);
      
      -- Atualizar lote
      UPDATE lotes SET quantidade_atual = quantidade_atual - qtd_dispensar WHERE id = lote.id;
      
      -- Registrar movimentação
      INSERT INTO movimentacoes (tipo, medicamento_id, lote_id, quantidade, usuario_id, prescricao_id, observacao)
      VALUES ('dispensacao', item.medicamento_id, lote.id, qtd_dispensar, _usuario_id, _prescricao_id, 
              'Dispensação automática - Lote ' || lote.numero_lote);
      
      qtd_restante := qtd_restante - qtd_dispensar;
      total_dispensado := total_dispensado + qtd_dispensar;
    END LOOP;
    
    -- Atualizar quantidade dispensada no item
    UPDATE itens_prescricao 
    SET quantidade_dispensada = item.quantidade_prescrita - qtd_restante
    WHERE id = item.id;
    
    resultado := resultado || jsonb_build_object(
      'medicamento', item.med_nome,
      'prescrito', item.quantidade_prescrita,
      'dispensado', item.quantidade_prescrita - qtd_restante
    );
  END LOOP;

  -- Atualizar status da prescrição
  IF NOT EXISTS (
    SELECT 1 FROM itens_prescricao
    WHERE prescricao_id = _prescricao_id AND quantidade_dispensada < quantidade_prescrita
  ) THEN
    UPDATE prescricoes SET status = 'totalmente_dispensada', updated_at = now() WHERE id = _prescricao_id;
  ELSE
    UPDATE prescricoes SET status = 'parcialmente_dispensada', updated_at = now() WHERE id = _prescricao_id;
  END IF;

  -- Gerar notificação
  INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, prescricao_id, link)
  VALUES ('dispensacao', 'Dispensação automática concluída',
    'Total de ' || total_dispensado || ' unidades dispensadas',
    'info', _prescricao_id, '/dispensacao');

  RETURN jsonb_build_object('success', true, 'total_dispensado', total_dispensado, 'itens', resultado);
END;
$$;

-- 6. Enable realtime on notificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
