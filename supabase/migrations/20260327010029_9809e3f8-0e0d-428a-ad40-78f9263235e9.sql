
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_meds integer;
  controlled_meds integer;
  low_stock integer;
  critical_stock integer;
  out_of_stock integer;
  expiring_soon integer;
  total_units bigint;
  total_value numeric;
  pending_transfers integer;
  total_movements integer;
  active_prescriptions integer;
  cmm_value integer;
BEGIN
  -- Total active meds
  SELECT COUNT(*) INTO total_meds FROM medicamentos WHERE ativo = true;
  
  -- Controlled
  SELECT COUNT(*) INTO controlled_meds FROM medicamentos WHERE ativo = true AND controlado = true;

  -- Stock status counts
  SELECT 
    COUNT(*) FILTER (WHERE total_qty = 0),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo * 0.25),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo AND total_qty > estoque_minimo * 0.25)
  INTO out_of_stock, critical_stock, low_stock
  FROM (
    SELECT m.id, m.estoque_minimo, COALESCE(SUM(l.quantidade_atual), 0) AS total_qty
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
    WHERE m.ativo = true
    GROUP BY m.id, m.estoque_minimo
  ) sub;

  -- Expiring within 60 days
  SELECT COUNT(DISTINCT m.id) INTO expiring_soon
  FROM medicamentos m
  JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
  WHERE m.ativo = true AND l.quantidade_atual > 0
    AND l.validade > CURRENT_DATE AND l.validade <= CURRENT_DATE + 60;

  -- Total units & value
  SELECT COALESCE(SUM(l.quantidade_atual), 0), COALESCE(SUM(l.quantidade_atual * l.preco_unitario), 0)
  INTO total_units, total_value
  FROM lotes l
  JOIN medicamentos m ON m.id = l.medicamento_id AND m.ativo = true
  WHERE l.ativo = true;

  -- Pending transfers
  SELECT COUNT(*) INTO pending_transfers FROM transferencias WHERE status = 'pendente';

  -- Total movements
  SELECT COUNT(*) INTO total_movements FROM movimentacoes;

  -- Active prescriptions
  SELECT COUNT(*) INTO active_prescriptions FROM prescricoes WHERE status = 'ativa';

  -- CMM (last 90 days average per month)
  SELECT COALESCE(ROUND(SUM(quantidade)::numeric / 3), 0) INTO cmm_value
  FROM movimentacoes
  WHERE tipo IN ('saida', 'dispensacao')
    AND created_at >= CURRENT_DATE - 90;

  RETURN jsonb_build_object(
    'total', total_meds,
    'controlled', controlled_meds,
    'lowStock', low_stock,
    'critical', critical_stock,
    'outOfStock', out_of_stock,
    'expiringSoon', expiring_soon,
    'totalUnits', total_units,
    'totalValue', total_value,
    'pendingTransfers', pending_transfers,
    'totalMovements', total_movements,
    'prescricoesAtivas', active_prescriptions,
    'cmm', cmm_value
  );
END;
$$;
