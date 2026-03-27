
CREATE TABLE public.filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text NOT NULL DEFAULT '',
  cnes text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  responsavel text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read filiais" ON public.filiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage filiais" ON public.filiais FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
