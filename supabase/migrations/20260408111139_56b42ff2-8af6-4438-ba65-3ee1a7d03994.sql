
CREATE OR REPLACE FUNCTION public.check_estoque_baixo()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  count_alerts integer := 0;
BEGIN
  FOR rec IN
    SELECT m.id, m.nome, m.estoque_minimo, m.filial_id,
           COALESCE(SUM(l.quantidade_atual), 0) AS total
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true AND m.estoque_minimo > 0
    GROUP BY m.id, m.nome, m.estoque_minimo, m.filial_id
    HAVING COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes
      WHERE medicamento_id = rec.id
        AND tipo = 'estoque_baixo'
        AND resolvida = false
        AND created_at > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, medicamento_id, link, filial_id)
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
        '/alertas',
        rec.filial_id
      );
      count_alerts := count_alerts + 1;
    END IF;
  END LOOP;
  
  UPDATE automacao_config SET ultima_execucao = now() WHERE tipo = 'alerta_estoque_baixo';
  RETURN count_alerts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_vencimento_lotes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  count_alerts integer := 0;
  cfg_dias integer;
BEGIN
  SELECT (parametros->>'dias_antecedencia')::integer INTO cfg_dias
  FROM automacao_config WHERE tipo = 'alerta_vencimento';
  cfg_dias := COALESCE(cfg_dias, 60);

  FOR rec IN
    SELECT l.id AS lote_id, l.numero_lote, l.validade, l.quantidade_atual, l.filial_id,
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
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, medicamento_id, lote_id, link, filial_id)
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
        '/alertas',
        rec.filial_id
      );
      count_alerts := count_alerts + 1;
    END IF;
  END LOOP;
  
  UPDATE automacao_config SET ultima_execucao = now() WHERE tipo = 'alerta_vencimento';
  RETURN count_alerts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.quarantine_expired_lotes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  count_quarantined integer := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT l.id AS lote_id, l.numero_lote, l.validade, l.quantidade_atual, l.filial_id,
           m.id AS med_id, m.nome
    FROM lotes l
    JOIN medicamentos m ON m.id = l.medicamento_id
    WHERE l.ativo = true
      AND l.validade < CURRENT_DATE
      AND l.quantidade_atual > 0
  LOOP
    UPDATE lotes SET ativo = false WHERE id = rec.lote_id;
    count_quarantined := count_quarantined + 1;

    IF NOT EXISTS (
      SELECT 1 FROM notificacoes
      WHERE lote_id = rec.lote_id
        AND tipo = 'vencimento'
        AND titulo LIKE '%QUARENTENA%'
        AND created_at > now() - interval '24 hours'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, lote_id, medicamento_id, link, filial_id)
      VALUES (
        'vencimento',
        rec.nome || ' — Lote em QUARENTENA',
        'Lote ' || rec.numero_lote || ' vencido em ' || to_char(rec.validade, 'DD/MM/YYYY') || ' — ' || rec.quantidade_atual || ' un. bloqueadas',
        'critico',
        rec.lote_id,
        rec.med_id,
        '/alertas',
        rec.filial_id
      );
    END IF;
  END LOOP;

  RETURN count_quarantined;
END;
$function$;
