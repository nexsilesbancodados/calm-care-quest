
CREATE OR REPLACE FUNCTION public.get_sidebar_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_count integer := 0;
  transfer_count integer;
  presc_count integer;
  rec RECORD;
BEGIN
  -- Count stock alerts (out of stock + critical)
  FOR rec IN
    SELECT m.id, m.estoque_minimo,
           COALESCE(SUM(l.quantidade_atual), 0) AS total
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true
    GROUP BY m.id, m.estoque_minimo
    HAVING COALESCE(SUM(l.quantidade_atual), 0) = 0
       OR (m.estoque_minimo > 0 AND COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo * 0.25)
  LOOP
    alert_count := alert_count + 1;
  END LOOP;

  -- Count expiring/expired lotes
  SELECT COUNT(*) INTO alert_count
  FROM (
    SELECT alert_count AS base
    UNION ALL
    SELECT 1 FROM lotes l
    WHERE l.ativo = true AND l.quantidade_atual > 0
      AND l.validade <= CURRENT_DATE + 60
  ) sub;
  alert_count := alert_count - 1; -- subtract the base row

  -- Add expired/expiring count
  alert_count := alert_count + (
    SELECT COUNT(*) FROM lotes l
    WHERE l.ativo = true AND l.quantidade_atual > 0
      AND l.validade <= CURRENT_DATE + 60
  );

  -- Pending transfers
  SELECT COUNT(*) INTO transfer_count
  FROM transferencias WHERE status = 'pendente';

  -- Active prescriptions
  SELECT COUNT(*) INTO presc_count
  FROM prescricoes WHERE status = 'ativa';

  RETURN jsonb_build_object(
    'alerts', alert_count,
    'transfers', transfer_count,
    'prescricoes', presc_count
  );
END;
$$;
