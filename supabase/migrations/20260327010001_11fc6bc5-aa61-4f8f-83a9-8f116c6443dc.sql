
CREATE OR REPLACE FUNCTION public.get_sidebar_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stock_alerts integer;
  expiry_alerts integer;
  transfer_count integer;
  presc_count integer;
BEGIN
  -- Stock alerts: out of stock or critical (<= 25% of min)
  SELECT COUNT(*) INTO stock_alerts
  FROM (
    SELECT m.id
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true
    GROUP BY m.id, m.estoque_minimo
    HAVING COALESCE(SUM(l.quantidade_atual), 0) = 0
       OR (m.estoque_minimo > 0 AND COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo * 0.25)
  ) sub;

  -- Expiring/expired lotes (within 60 days)
  SELECT COUNT(*) INTO expiry_alerts
  FROM lotes
  WHERE ativo = true AND quantidade_atual > 0
    AND validade <= CURRENT_DATE + 60;

  -- Pending transfers
  SELECT COUNT(*) INTO transfer_count
  FROM transferencias WHERE status = 'pendente';

  -- Active prescriptions
  SELECT COUNT(*) INTO presc_count
  FROM prescricoes WHERE status = 'ativa';

  RETURN jsonb_build_object(
    'alerts', stock_alerts + expiry_alerts,
    'transfers', transfer_count,
    'prescricoes', presc_count
  );
END;
$$;
