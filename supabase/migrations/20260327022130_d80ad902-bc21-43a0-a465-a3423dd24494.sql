
-- Update get_dashboard_stats to filter by calling user's filial
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _filial_id uuid;
BEGIN
  _filial_id := get_user_filial_id(auth.uid());

  -- Total active meds (filtered by filial)
  SELECT COUNT(*) INTO total_meds FROM medicamentos 
  WHERE ativo = true AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);
  
  -- Controlled
  SELECT COUNT(*) INTO controlled_meds FROM medicamentos 
  WHERE ativo = true AND controlado = true AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- Stock status counts
  SELECT 
    COUNT(*) FILTER (WHERE total_qty = 0),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo * 0.25),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo AND total_qty > estoque_minimo * 0.25)
  INTO out_of_stock, critical_stock, low_stock
  FROM (
    SELECT m.id, m.estoque_minimo, COALESCE(SUM(l.quantidade_atual), 0) AS total_qty
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true AND (_filial_id IS NULL OR l.filial_id IS NULL OR l.filial_id = _filial_id)
    WHERE m.ativo = true AND (_filial_id IS NULL OR m.filial_id IS NULL OR m.filial_id = _filial_id)
    GROUP BY m.id, m.estoque_minimo
  ) sub;

  -- Expiring within 60 days
  SELECT COUNT(DISTINCT m.id) INTO expiring_soon
  FROM medicamentos m
  JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true
  WHERE m.ativo = true AND l.quantidade_atual > 0
    AND l.validade > CURRENT_DATE AND l.validade <= CURRENT_DATE + 60
    AND (_filial_id IS NULL OR m.filial_id IS NULL OR m.filial_id = _filial_id)
    AND (_filial_id IS NULL OR l.filial_id IS NULL OR l.filial_id = _filial_id);

  -- Total units & value
  SELECT COALESCE(SUM(l.quantidade_atual), 0), COALESCE(SUM(l.quantidade_atual * l.preco_unitario), 0)
  INTO total_units, total_value
  FROM lotes l
  JOIN medicamentos m ON m.id = l.medicamento_id AND m.ativo = true
  WHERE l.ativo = true
    AND (_filial_id IS NULL OR l.filial_id IS NULL OR l.filial_id = _filial_id);

  -- Pending transfers
  SELECT COUNT(*) INTO pending_transfers FROM transferencias 
  WHERE status = 'pendente' AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- Total movements
  SELECT COUNT(*) INTO total_movements FROM movimentacoes
  WHERE (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- Active prescriptions
  SELECT COUNT(*) INTO active_prescriptions FROM prescricoes 
  WHERE status = 'ativa' AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- CMM (last 90 days average per month)
  SELECT COALESCE(ROUND(SUM(quantidade)::numeric / 3), 0) INTO cmm_value
  FROM movimentacoes
  WHERE tipo IN ('saida', 'dispensacao')
    AND created_at >= CURRENT_DATE - 90
    AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

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
$function$;

-- Update get_sidebar_counts to filter by calling user's filial
CREATE OR REPLACE FUNCTION public.get_sidebar_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stock_alerts integer;
  expiry_alerts integer;
  transfer_count integer;
  presc_count integer;
  _filial_id uuid;
BEGIN
  _filial_id := get_user_filial_id(auth.uid());

  -- Stock alerts
  SELECT COUNT(*) INTO stock_alerts
  FROM (
    SELECT m.id
    FROM medicamentos m
    LEFT JOIN lotes l ON l.medicamento_id = m.id AND l.ativo = true AND (_filial_id IS NULL OR l.filial_id IS NULL OR l.filial_id = _filial_id)
    WHERE m.ativo = true AND (_filial_id IS NULL OR m.filial_id IS NULL OR m.filial_id = _filial_id)
    GROUP BY m.id, m.estoque_minimo
    HAVING COALESCE(SUM(l.quantidade_atual), 0) = 0
       OR (m.estoque_minimo > 0 AND COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo * 0.25)
  ) sub;

  -- Expiring/expired lotes (within 60 days)
  SELECT COUNT(*) INTO expiry_alerts
  FROM lotes
  WHERE ativo = true AND quantidade_atual > 0
    AND validade <= CURRENT_DATE + 60
    AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- Pending transfers
  SELECT COUNT(*) INTO transfer_count
  FROM transferencias WHERE status = 'pendente'
    AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  -- Active prescriptions
  SELECT COUNT(*) INTO presc_count
  FROM prescricoes WHERE status = 'ativa'
    AND (_filial_id IS NULL OR filial_id IS NULL OR filial_id = _filial_id);

  RETURN jsonb_build_object(
    'alerts', stock_alerts + expiry_alerts,
    'transfers', transfer_count,
    'prescricoes', presc_count
  );
END;
$function$;
