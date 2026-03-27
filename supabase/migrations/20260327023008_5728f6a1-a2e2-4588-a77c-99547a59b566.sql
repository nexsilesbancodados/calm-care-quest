-- Corrige legado: medicamentos sem filial pertencem à unidade principal
WITH principal AS (
  SELECT id
  FROM public.filiais
  WHERE nome ILIKE 'Unidade Principal%'
  LIMIT 1
)
UPDATE public.medicamentos m
SET filial_id = (SELECT id FROM principal)
WHERE m.filial_id IS NULL;

-- Corrige legado: lotes sem filial herdam a filial do medicamento
UPDATE public.lotes l
SET filial_id = m.filial_id
FROM public.medicamentos m
WHERE l.medicamento_id = m.id
  AND l.filial_id IS NULL;

-- Garante fallback para qualquer lote restante sem filial
WITH principal AS (
  SELECT id
  FROM public.filiais
  WHERE nome ILIKE 'Unidade Principal%'
  LIMIT 1
)
UPDATE public.lotes l
SET filial_id = (SELECT id FROM principal)
WHERE l.filial_id IS NULL;

-- Bloqueia visibilidade de registros sem filial/correspondência exata
CREATE OR REPLACE FUNCTION public.is_own_filial(_user_id uuid, _filial_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT _filial_id IS NOT NULL
    AND public.get_user_filial_id(_user_id) IS NOT NULL
    AND _filial_id = public.get_user_filial_id(_user_id)
$$;

-- Endurece escrita de medicamentos
DROP POLICY IF EXISTS "Admin write medicamentos" ON public.medicamentos;
CREATE POLICY "Admin write medicamentos"
ON public.medicamentos
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
);

DROP POLICY IF EXISTS "Farm write medicamentos" ON public.medicamentos;
CREATE POLICY "Farm write medicamentos"
ON public.medicamentos
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'farmaceutico'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'farmaceutico'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
);

-- Endurece escrita de lotes
DROP POLICY IF EXISTS "Admin write lotes" ON public.lotes;
CREATE POLICY "Admin write lotes"
ON public.lotes
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
);

DROP POLICY IF EXISTS "Farm write lotes" ON public.lotes;
CREATE POLICY "Farm write lotes"
ON public.lotes
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'farmaceutico'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'farmaceutico'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
);

-- Dashboard sempre restrito à filial ativa
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_meds integer := 0;
  controlled_meds integer := 0;
  low_stock integer := 0;
  critical_stock integer := 0;
  out_of_stock integer := 0;
  expiring_soon integer := 0;
  total_units bigint := 0;
  total_value numeric := 0;
  pending_transfers integer := 0;
  total_movements integer := 0;
  active_prescriptions integer := 0;
  cmm_value integer := 0;
  _filial_id uuid;
BEGIN
  _filial_id := public.get_user_filial_id(auth.uid());

  IF _filial_id IS NULL THEN
    RETURN jsonb_build_object(
      'total', 0,
      'controlled', 0,
      'lowStock', 0,
      'critical', 0,
      'outOfStock', 0,
      'expiringSoon', 0,
      'totalUnits', 0,
      'totalValue', 0,
      'pendingTransfers', 0,
      'totalMovements', 0,
      'prescricoesAtivas', 0,
      'cmm', 0
    );
  END IF;

  SELECT COUNT(*) INTO total_meds
  FROM public.medicamentos
  WHERE ativo = true AND filial_id = _filial_id;

  SELECT COUNT(*) INTO controlled_meds
  FROM public.medicamentos
  WHERE ativo = true AND controlado = true AND filial_id = _filial_id;

  SELECT 
    COUNT(*) FILTER (WHERE total_qty = 0),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo * 0.25),
    COUNT(*) FILTER (WHERE total_qty > 0 AND estoque_minimo > 0 AND total_qty <= estoque_minimo AND total_qty > estoque_minimo * 0.25)
  INTO out_of_stock, critical_stock, low_stock
  FROM (
    SELECT m.id, m.estoque_minimo, COALESCE(SUM(l.quantidade_atual), 0) AS total_qty
    FROM public.medicamentos m
    LEFT JOIN public.lotes l
      ON l.medicamento_id = m.id
     AND l.ativo = true
     AND l.filial_id = _filial_id
    WHERE m.ativo = true
      AND m.filial_id = _filial_id
    GROUP BY m.id, m.estoque_minimo
  ) sub;

  SELECT COUNT(DISTINCT m.id) INTO expiring_soon
  FROM public.medicamentos m
  JOIN public.lotes l
    ON l.medicamento_id = m.id
   AND l.ativo = true
   AND l.filial_id = _filial_id
  WHERE m.ativo = true
    AND m.filial_id = _filial_id
    AND l.quantidade_atual > 0
    AND l.validade > CURRENT_DATE
    AND l.validade <= CURRENT_DATE + 60;

  SELECT COALESCE(SUM(l.quantidade_atual), 0), COALESCE(SUM(l.quantidade_atual * l.preco_unitario), 0)
  INTO total_units, total_value
  FROM public.lotes l
  JOIN public.medicamentos m
    ON m.id = l.medicamento_id
   AND m.ativo = true
   AND m.filial_id = _filial_id
  WHERE l.ativo = true
    AND l.filial_id = _filial_id;

  SELECT COUNT(*) INTO pending_transfers
  FROM public.transferencias
  WHERE status = 'pendente'
    AND filial_id = _filial_id;

  SELECT COUNT(*) INTO total_movements
  FROM public.movimentacoes
  WHERE filial_id = _filial_id;

  SELECT COUNT(*) INTO active_prescriptions
  FROM public.prescricoes
  WHERE status = 'ativa'
    AND filial_id = _filial_id;

  SELECT COALESCE(ROUND(SUM(quantidade)::numeric / 3), 0) INTO cmm_value
  FROM public.movimentacoes
  WHERE tipo IN ('saida', 'dispensacao')
    AND created_at >= CURRENT_DATE - 90
    AND filial_id = _filial_id;

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

CREATE OR REPLACE FUNCTION public.get_sidebar_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stock_alerts integer := 0;
  expiry_alerts integer := 0;
  transfer_count integer := 0;
  presc_count integer := 0;
  _filial_id uuid;
BEGIN
  _filial_id := public.get_user_filial_id(auth.uid());

  IF _filial_id IS NULL THEN
    RETURN jsonb_build_object('alerts', 0, 'transfers', 0, 'prescricoes', 0);
  END IF;

  SELECT COUNT(*) INTO stock_alerts
  FROM (
    SELECT m.id
    FROM public.medicamentos m
    LEFT JOIN public.lotes l
      ON l.medicamento_id = m.id
     AND l.ativo = true
     AND l.filial_id = _filial_id
    WHERE m.ativo = true
      AND m.filial_id = _filial_id
    GROUP BY m.id, m.estoque_minimo
    HAVING COALESCE(SUM(l.quantidade_atual), 0) = 0
       OR (m.estoque_minimo > 0 AND COALESCE(SUM(l.quantidade_atual), 0) <= m.estoque_minimo * 0.25)
  ) sub;

  SELECT COUNT(*) INTO expiry_alerts
  FROM public.lotes
  WHERE ativo = true
    AND quantidade_atual > 0
    AND validade <= CURRENT_DATE + 60
    AND filial_id = _filial_id;

  SELECT COUNT(*) INTO transfer_count
  FROM public.transferencias
  WHERE status = 'pendente'
    AND filial_id = _filial_id;

  SELECT COUNT(*) INTO presc_count
  FROM public.prescricoes
  WHERE status = 'ativa'
    AND filial_id = _filial_id;

  RETURN jsonb_build_object(
    'alerts', stock_alerts + expiry_alerts,
    'transfers', transfer_count,
    'prescricoes', presc_count
  );
END;
$function$;