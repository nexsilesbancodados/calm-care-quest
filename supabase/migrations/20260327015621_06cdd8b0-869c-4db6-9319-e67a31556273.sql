-- Allow unauthenticated users to read filial names for login selector
CREATE POLICY "Public read filiais for login"
ON public.filiais
FOR SELECT
TO anon
USING (ativo = true);