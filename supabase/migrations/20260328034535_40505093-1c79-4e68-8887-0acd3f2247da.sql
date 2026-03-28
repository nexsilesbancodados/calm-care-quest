
-- ===== BLOCO 3: Quarantine expired lotes function =====
CREATE OR REPLACE FUNCTION public.quarantine_expired_lotes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  count_quarantined integer := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT l.id AS lote_id, l.numero_lote, l.validade, l.quantidade_atual,
           m.id AS med_id, m.nome
    FROM lotes l
    JOIN medicamentos m ON m.id = l.medicamento_id
    WHERE l.ativo = true
      AND l.validade < CURRENT_DATE
      AND l.quantidade_atual > 0
  LOOP
    -- Deactivate the expired lot
    UPDATE lotes SET ativo = false WHERE id = rec.lote_id;
    count_quarantined := count_quarantined + 1;

    -- Create notification if not already notified
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes
      WHERE lote_id = rec.lote_id
        AND tipo = 'vencimento'
        AND titulo LIKE '%QUARENTENA%'
        AND created_at > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, lote_id, medicamento_id, link)
      VALUES (
        'vencimento',
        rec.nome || ' — Lote em QUARENTENA',
        'Lote ' || rec.numero_lote || ' vencido em ' || to_char(rec.validade, 'DD/MM/YYYY') || ' — ' || rec.quantidade_atual || ' un. bloqueadas',
        'critico',
        rec.lote_id,
        rec.med_id,
        '/alertas'
      );
    END IF;
  END LOOP;

  RETURN count_quarantined;
END;
$$;

-- ===== BLOCO 4: Advanced KPIs RPC =====
CREATE OR REPLACE FUNCTION public.get_advanced_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _filial_id uuid;
  curva_a integer := 0;
  curva_b integer := 0;
  curva_c integer := 0;
  taxa_atendimento numeric := 0;
  total_solicitacoes integer := 0;
  sol_atendidas integer := 0;
  devolucoes_mes integer := 0;
  quarentena_count integer := 0;
BEGIN
  _filial_id := public.get_user_filial_id(auth.uid());

  IF _filial_id IS NULL THEN
    RETURN jsonb_build_object(
      'curvaA', 0, 'curvaB', 0, 'curvaC', 0,
      'taxaAtendimento', 0, 'totalSolicitacoes', 0,
      'devolucoesMes', 0, 'quarentena', 0
    );
  END IF;

  -- Curva ABC: based on last 90 days consumption value
  WITH consumo AS (
    SELECT m.medicamento_id,
           SUM(m.quantidade * COALESCE(l.preco_unitario, 0)) AS valor_consumo
    FROM movimentacoes m
    LEFT JOIN lotes l ON l.id = m.lote_id
    WHERE m.tipo IN ('saida', 'dispensacao')
      AND m.created_at >= CURRENT_DATE - 90
      AND m.filial_id = _filial_id
    GROUP BY m.medicamento_id
  ),
  ranked AS (
    SELECT medicamento_id, valor_consumo,
           SUM(valor_consumo) OVER (ORDER BY valor_consumo DESC) AS acum,
           SUM(valor_consumo) OVER () AS total
    FROM consumo
  ),
  classified AS (
    SELECT medicamento_id,
           CASE
             WHEN total > 0 AND acum <= total * 0.8 THEN 'A'
             WHEN total > 0 AND acum <= total * 0.95 THEN 'B'
             ELSE 'C'
           END AS classe
    FROM ranked
  )
  SELECT
    COUNT(*) FILTER (WHERE classe = 'A'),
    COUNT(*) FILTER (WHERE classe = 'B'),
    COUNT(*) FILTER (WHERE classe = 'C')
  INTO curva_a, curva_b, curva_c
  FROM classified;

  -- Taxa de atendimento de solicitações (últimos 30 dias)
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'atendida')
  INTO total_solicitacoes, sol_atendidas
  FROM solicitacoes_medicamentos
  WHERE created_at >= CURRENT_DATE - 30
    AND filial_id = _filial_id;

  IF total_solicitacoes > 0 THEN
    taxa_atendimento := ROUND((sol_atendidas::numeric / total_solicitacoes) * 100, 1);
  END IF;

  -- Devoluções no mês
  SELECT COUNT(*) INTO devolucoes_mes
  FROM movimentacoes
  WHERE tipo = 'devolucao'
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND filial_id = _filial_id;

  -- Lotes em quarentena (vencidos desativados com qty > 0)
  SELECT COUNT(*) INTO quarentena_count
  FROM lotes
  WHERE ativo = false
    AND validade < CURRENT_DATE
    AND quantidade_atual > 0
    AND filial_id = _filial_id;

  RETURN jsonb_build_object(
    'curvaA', curva_a,
    'curvaB', curva_b,
    'curvaC', curva_c,
    'taxaAtendimento', taxa_atendimento,
    'totalSolicitacoes', total_solicitacoes,
    'devolucoesMes', devolucoes_mes,
    'quarentena', quarentena_count
  );
END;
$$;

-- ===== Productivity per user RPC =====
CREATE OR REPLACE FUNCTION public.get_user_productivity(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _filial_id uuid;
BEGIN
  _filial_id := public.get_user_filial_id(auth.uid());

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb)
    FROM (
      SELECT
        p.nome AS usuario,
        COUNT(*) AS total_movimentacoes,
        COUNT(*) FILTER (WHERE m.tipo = 'dispensacao') AS dispensacoes,
        COUNT(*) FILTER (WHERE m.tipo = 'entrada') AS entradas,
        COUNT(*) FILTER (WHERE m.tipo = 'devolucao') AS devolucoes,
        SUM(m.quantidade) AS total_unidades
      FROM movimentacoes m
      JOIN profiles p ON p.user_id = m.usuario_id
      WHERE m.created_at >= CURRENT_DATE - _days
        AND m.filial_id = _filial_id
      GROUP BY p.nome
      ORDER BY COUNT(*) DESC
      LIMIT 20
    ) sub
  );
END;
$$;
