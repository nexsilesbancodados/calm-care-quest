
-- Function to get user's filial_id
CREATE OR REPLACE FUNCTION public.get_user_filial_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filial_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Add filial_id to main tables
ALTER TABLE public.medicamentos ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.lotes ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.movimentacoes ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.prescricoes ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.notificacoes ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.fornecedores ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.transferencias ADD COLUMN filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL DEFAULT NULL;

-- Helper: check if user is admin OR data belongs to their filial
-- filial_id IS NULL means legacy/shared data (visible to all)
CREATE OR REPLACE FUNCTION public.is_own_filial(_user_id uuid, _filial_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin'::app_role)
    OR _filial_id IS NULL
    OR _filial_id = get_user_filial_id(_user_id)
$$;

-- DROP existing SELECT policies and recreate with filial filter
-- MEDICAMENTOS
DROP POLICY IF EXISTS "Auth read medicamentos" ON public.medicamentos;
CREATE POLICY "Auth read medicamentos" ON public.medicamentos FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- LOTES
DROP POLICY IF EXISTS "Auth read lotes" ON public.lotes;
CREATE POLICY "Auth read lotes" ON public.lotes FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- MOVIMENTACOES
DROP POLICY IF EXISTS "Auth read movimentacoes" ON public.movimentacoes;
CREATE POLICY "Auth read movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- PRESCRICOES
DROP POLICY IF EXISTS "Auth read prescricoes" ON public.prescricoes;
CREATE POLICY "Auth read prescricoes" ON public.prescricoes FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- NOTIFICACOES
DROP POLICY IF EXISTS "Auth read notificacoes" ON public.notificacoes;
CREATE POLICY "Auth read notificacoes" ON public.notificacoes FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- FORNECEDORES
DROP POLICY IF EXISTS "Auth read fornecedores" ON public.fornecedores;
CREATE POLICY "Auth read fornecedores" ON public.fornecedores FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

-- TRANSFERENCIAS
DROP POLICY IF EXISTS "Auth read transferencias" ON public.transferencias;
CREATE POLICY "Auth read transferencias" ON public.transferencias FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));
