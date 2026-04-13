
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
    SELECT m.id, m.nome, m.estoque_minimo, m.ponto_pedido, m.filial_id,
           COALESCE(SUM(l.quantidade_atual), 0) AS total
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true
    GROUP BY m.id, m.nome, m.estoque_minimo, m.ponto_pedido, m.filial_id
    HAVING COALESCE(SUM(l.quantidade_atual), 0) <= GREATEST(m.estoque_minimo, m.ponto_pedido)
      AND GREATEST(m.estoque_minimo, m.ponto_pedido) > 0
  LOOP
    -- Alerta de estoque baixo/crítico/esgotado
    IF rec.estoque_minimo > 0 AND rec.total <= rec.estoque_minimo THEN
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
    END IF;

    -- Alerta de ponto de pedido (compra)
    IF rec.ponto_pedido > 0 AND rec.total <= rec.ponto_pedido AND rec.total > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM notificacoes
        WHERE medicamento_id = rec.id
          AND tipo = 'ponto_pedido'
          AND resolvida = false
          AND created_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO notificacoes (tipo, titulo, mensagem, severidade, medicamento_id, link, filial_id)
        VALUES (
          'ponto_pedido',
          rec.nome || ' — Ponto de Pedido atingido',
          'Estoque atual: ' || rec.total || ' un. (ponto de pedido: ' || rec.ponto_pedido || '). Solicitar reposição.',
          'medio',
          rec.id,
          '/alertas',
          rec.filial_id
        );
        count_alerts := count_alerts + 1;
      END IF;
    END IF;
  END LOOP;
  
  UPDATE automacao_config SET ultima_execucao = now() WHERE tipo = 'alerta_estoque_baixo';
  RETURN count_alerts;
END;
$$;
