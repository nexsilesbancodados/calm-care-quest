-- Filial ativa do admin e isolamento de funcionários por unidade

-- View segura para listar perfis apenas da filial ativa do usuário logado
CREATE OR REPLACE VIEW public.profiles_with_roles
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.user_id,
  p.nome,
  p.avatar_url,
  p.ativo,
  p.created_at,
  p.filial_id,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id;

-- Restringe leitura ampla de perfis: admin só vê sua filial ativa, usuário comum só o próprio
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read active-filial profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
);

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage active-filial profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_own_filial(auth.uid(), filial_id)
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.is_own_filial(auth.uid(), filial_id)
  )
  OR auth.uid() = user_id
);

-- Roles: admin só gerencia papéis da filial ativa
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage active-filial roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = public.user_roles.user_id
      AND public.is_own_filial(auth.uid(), p.filial_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = public.user_roles.user_id
      AND public.is_own_filial(auth.uid(), p.filial_id)
  )
);

-- Função para o admin trocar a unidade ativa com o mesmo login
CREATE OR REPLACE FUNCTION public.set_active_filial(_filial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.filiais
    WHERE id = _filial_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Filial inválida';
  END IF;

  UPDATE public.profiles
  SET filial_id = _filial_id
  WHERE user_id = auth.uid();
END;
$$;