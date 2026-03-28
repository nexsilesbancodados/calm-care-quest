
-- Bloco 2: Solicitações de Medicamentos
CREATE TABLE IF NOT EXISTS public.solicitacoes_medicamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id uuid NOT NULL,
  medicamento_id uuid REFERENCES public.medicamentos(id),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  setor text NOT NULL DEFAULT '',
  urgencia boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada', 'atendida')),
  observacao text DEFAULT '',
  resposta_farmaceutico text DEFAULT '',
  atendida_em timestamptz,
  created_at timestamptz DEFAULT now(),
  filial_id uuid REFERENCES public.filiais(id)
);

ALTER TABLE public.solicitacoes_medicamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read own or all" ON public.solicitacoes_medicamentos
FOR SELECT TO authenticated
USING (solicitante_id = auth.uid() OR public.has_role(auth.uid(), 'farmaceutico') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enfermeiro insert" ON public.solicitacoes_medicamentos
FOR INSERT TO authenticated
WITH CHECK (solicitante_id = auth.uid());

CREATE POLICY "Farmaceutico update" ON public.solicitacoes_medicamentos
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'farmaceutico') OR public.has_role(auth.uid(), 'admin'));

-- Bloco 3: Avatar bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar user upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar user update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Bloco 4: Pacientes table
CREATE TABLE IF NOT EXISTS public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text,
  prontuario text NOT NULL,
  data_nascimento date,
  sexo text CHECK (sexo IN ('M', 'F', 'outro')),
  leito text,
  setor text,
  diagnostico_cid text,
  responsavel_nome text,
  responsavel_telefone text,
  ativo boolean DEFAULT true,
  filial_id uuid REFERENCES public.filiais(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(prontuario, filial_id)
);

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access pacientes" ON public.pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bloco 5: Controlled med validation columns
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS crf_responsavel text;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS validado_em timestamptz;

-- Bloco 6: NF URL column + NF storage policies
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS nota_fiscal_url text;

CREATE POLICY "NF authenticated read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notas_fiscais');
CREATE POLICY "NF authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notas_fiscais');
