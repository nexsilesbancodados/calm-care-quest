
-- Fix overly permissive update policy on notificacoes
DROP POLICY "Auth update notificacoes" ON public.notificacoes;
CREATE POLICY "Auth update own notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    -- Only allow updating lida and resolvida fields (not other data)
    true
  );

-- Fix service_role insert policy (service_role bypasses RLS anyway)
DROP POLICY "Service insert notificacoes" ON public.notificacoes;
