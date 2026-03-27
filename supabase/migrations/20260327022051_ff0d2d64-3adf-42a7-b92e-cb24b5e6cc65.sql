
-- 1. Update is_own_filial to remove admin bypass
CREATE OR REPLACE FUNCTION public.is_own_filial(_user_id uuid, _filial_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    _filial_id IS NULL
    OR get_user_filial_id(_user_id) IS NULL
    OR _filial_id = get_user_filial_id(_user_id)
$$;

-- 2. Update admin ALL policies on data tables to include filial filtering in USING clause

-- medicamentos
DROP POLICY IF EXISTS "Admin write medicamentos" ON public.medicamentos;
CREATE POLICY "Admin write medicamentos" ON public.medicamentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- lotes
DROP POLICY IF EXISTS "Admin write lotes" ON public.lotes;
CREATE POLICY "Admin write lotes" ON public.lotes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- movimentacoes (admin only has INSERT, no ALL)
-- Keep as-is since it's INSERT only

-- fornecedores
DROP POLICY IF EXISTS "Admin manage fornecedores" ON public.fornecedores;
CREATE POLICY "Admin manage fornecedores" ON public.fornecedores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- transferencias
DROP POLICY IF EXISTS "Admin manage transferencias" ON public.transferencias;
CREATE POLICY "Admin manage transferencias" ON public.transferencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- prescricoes
DROP POLICY IF EXISTS "Admin manage prescricoes" ON public.prescricoes;
CREATE POLICY "Admin manage prescricoes" ON public.prescricoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- notificacoes (keep read/update as-is, only admin insert uses role check)

-- itens_prescricao
DROP POLICY IF EXISTS "Admin manage itens_prescricao" ON public.itens_prescricao;
CREATE POLICY "Admin manage itens_prescricao" ON public.itens_prescricao
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
