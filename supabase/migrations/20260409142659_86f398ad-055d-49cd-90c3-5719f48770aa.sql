
-- =====================================================
-- 1. PACIENTES: Replace open policy with filial-scoped
-- =====================================================
DROP POLICY IF EXISTS "Authenticated access pacientes" ON public.pacientes;

CREATE POLICY "Auth read pacientes"
ON public.pacientes FOR SELECT TO authenticated
USING (is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Admin manage pacientes"
ON public.pacientes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Farm manage pacientes"
ON public.pacientes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Enf manage pacientes"
ON public.pacientes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'enfermeiro'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'enfermeiro'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Aux read pacientes"
ON public.pacientes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'auxiliar_farmacia'::app_role) AND is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 2. NOTIFICACOES: Restrict update to own filial
-- =====================================================
DROP POLICY IF EXISTS "Auth update own notificacoes" ON public.notificacoes;

CREATE POLICY "Auth update own notificacoes"
ON public.notificacoes FOR UPDATE TO authenticated
USING (is_own_filial(auth.uid(), filial_id))
WITH CHECK (is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 3. AUDIT_LOG: Restrict insert to own user_id
-- =====================================================
DROP POLICY IF EXISTS "Auth insert audit" ON public.audit_log;

CREATE POLICY "Auth insert audit"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- =====================================================
-- 4. ITENS_PRESCRICAO: Scope read to own filial
-- =====================================================
DROP POLICY IF EXISTS "Auth read itens_prescricao" ON public.itens_prescricao;

CREATE POLICY "Auth read itens_prescricao"
ON public.itens_prescricao FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prescricoes p
    WHERE p.id = itens_prescricao.prescricao_id
    AND is_own_filial(auth.uid(), p.filial_id)
  )
);

-- =====================================================
-- 5. FORNECEDORES: Scope farmaceutico to own filial
-- =====================================================
DROP POLICY IF EXISTS "Farm manage fornecedores" ON public.fornecedores;

CREATE POLICY "Farm manage fornecedores"
ON public.fornecedores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 6. PRESCRICOES: Scope farm/enf to own filial
-- =====================================================
DROP POLICY IF EXISTS "Farm manage prescricoes" ON public.prescricoes;
DROP POLICY IF EXISTS "Enf manage prescricoes" ON public.prescricoes;

CREATE POLICY "Farm manage prescricoes"
ON public.prescricoes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Enf manage prescricoes"
ON public.prescricoes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'enfermeiro'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'enfermeiro'::app_role) AND is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 7. TRANSFERENCIAS: Scope farm to own filial
-- =====================================================
DROP POLICY IF EXISTS "Farm manage transferencias" ON public.transferencias;

CREATE POLICY "Farm manage transferencias"
ON public.transferencias FOR ALL TO authenticated
USING (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id))
WITH CHECK (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 8. MOVIMENTACOES: Scope inserts to own filial
-- =====================================================
DROP POLICY IF EXISTS "Admin insert movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Farm insert movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Enf insert movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Aux insert movimentacoes" ON public.movimentacoes;

CREATE POLICY "Admin insert movimentacoes"
ON public.movimentacoes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Farm insert movimentacoes"
ON public.movimentacoes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'farmaceutico'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Enf insert movimentacoes"
ON public.movimentacoes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'enfermeiro'::app_role) AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Aux insert movimentacoes"
ON public.movimentacoes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'auxiliar_farmacia'::app_role) AND is_own_filial(auth.uid(), filial_id));

-- =====================================================
-- 9. ITENS_PRESCRICAO: Scope farm/enf writes to filial
-- =====================================================
DROP POLICY IF EXISTS "Farm manage itens_prescricao" ON public.itens_prescricao;
DROP POLICY IF EXISTS "Enf manage itens_prescricao" ON public.itens_prescricao;

CREATE POLICY "Farm manage itens_prescricao"
ON public.itens_prescricao FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'farmaceutico'::app_role) AND
  EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = itens_prescricao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
)
WITH CHECK (
  has_role(auth.uid(), 'farmaceutico'::app_role) AND
  EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = itens_prescricao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
);

CREATE POLICY "Enf manage itens_prescricao"
ON public.itens_prescricao FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'enfermeiro'::app_role) AND
  EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = itens_prescricao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
)
WITH CHECK (
  has_role(auth.uid(), 'enfermeiro'::app_role) AND
  EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = itens_prescricao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
);

-- Also scope admin on itens_prescricao
DROP POLICY IF EXISTS "Admin manage itens_prescricao" ON public.itens_prescricao;

CREATE POLICY "Admin manage itens_prescricao"
ON public.itens_prescricao FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (SELECT 1 FROM public.prescricoes p WHERE p.id = itens_prescricao.prescricao_id AND is_own_filial(auth.uid(), p.filial_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- 10. STORAGE notas_fiscais: Scope by filial path
-- =====================================================
DROP POLICY IF EXISTS "Auth read notas" ON storage.objects;
DROP POLICY IF EXISTS "NF authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload notas" ON storage.objects;
DROP POLICY IF EXISTS "NF authenticated upload" ON storage.objects;

CREATE POLICY "NF filial read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notas_fiscais'
  AND (storage.foldername(name))[1] = (public.get_user_filial_id(auth.uid()))::text
);

CREATE POLICY "NF filial upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notas_fiscais'
  AND (storage.foldername(name))[1] = (public.get_user_filial_id(auth.uid()))::text
);
