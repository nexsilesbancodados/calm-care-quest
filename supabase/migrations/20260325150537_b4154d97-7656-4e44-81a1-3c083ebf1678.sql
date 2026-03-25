
-- =============================================
-- PharmaControl: Complete Schema Rebuild
-- =============================================

-- Drop existing tables
DROP TABLE IF EXISTS public.transfer_items CASCADE;
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.supplier_orders CASCADE;
DROP TABLE IF EXISTS public.supplier_medications CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.dispensations CASCADE;
DROP TABLE IF EXISTS public.patient_evolution CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.movements CASCADE;
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- Drop old function/trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- Drop old types if exist
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.tipo_movimentacao CASCADE;
DROP TYPE IF EXISTS public.status_transferencia CASCADE;

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'farmaceutico', 'auxiliar_farmacia', 'enfermeiro', 'visualizador');
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'saida', 'transferencia', 'ajuste', 'dispensacao');
CREATE TYPE public.status_transferencia AS ENUM ('pendente', 'aprovado', 'enviado', 'recebido', 'cancelado');

-- =============================================
-- TABLES
-- =============================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (separate table for RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Categorias de Medicamento
CREATE TABLE public.categorias_medicamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clínicas Parceiras
CREATE TABLE public.clinicas_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnes TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medicamentos
CREATE TABLE public.medicamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  generico TEXT NOT NULL DEFAULT '',
  principio_ativo TEXT NOT NULL DEFAULT '',
  concentracao TEXT NOT NULL DEFAULT '',
  forma_farmaceutica TEXT NOT NULL DEFAULT 'Comprimido',
  codigo_barras TEXT,
  categoria_id UUID REFERENCES public.categorias_medicamento(id),
  controlado BOOLEAN NOT NULL DEFAULT false,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  estoque_maximo INTEGER NOT NULL DEFAULT 0,
  localizacao TEXT NOT NULL DEFAULT '',
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lotes
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID REFERENCES public.medicamentos(id) ON DELETE CASCADE NOT NULL,
  numero_lote TEXT NOT NULL DEFAULT '',
  validade DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  quantidade_atual INTEGER NOT NULL DEFAULT 0,
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Movimentações
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_movimentacao NOT NULL DEFAULT 'entrada',
  medicamento_id UUID REFERENCES public.medicamentos(id),
  lote_id UUID REFERENCES public.lotes(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID REFERENCES auth.users(id),
  paciente TEXT,
  prontuario TEXT,
  setor TEXT,
  nota_fiscal TEXT,
  observacao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transferências
CREATE TABLE public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID REFERENCES public.medicamentos(id),
  lote_id UUID REFERENCES public.lotes(id),
  quantidade INTEGER NOT NULL DEFAULT 0,
  clinica_origem_id UUID REFERENCES public.clinicas_parceiras(id),
  clinica_destino_id UUID REFERENCES public.clinicas_parceiras(id),
  status status_transferencia NOT NULL DEFAULT 'pendente',
  solicitante_id UUID REFERENCES auth.users(id),
  aprovador_id UUID REFERENCES auth.users(id),
  urgencia BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurações do Hospital
CREATE TABLE public.configuracoes_hospital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Hospital Psiquiátrico',
  cnes TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  alerta_estoque_pct INTEGER NOT NULL DEFAULT 20,
  alerta_vencimento_dias INTEGER NOT NULL DEFAULT 60
);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL DEFAULT '',
  registro_id TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visualizador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote user to admin (utility)
CREATE OR REPLACE FUNCTION public.promote_to_admin(_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = _email;
  IF _uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  END IF;
END;
$$;

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_medicamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas_parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_hospital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categorias (all auth read, admin write)
CREATE POLICY "Auth read categorias" ON public.categorias_medicamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage categorias" ON public.categorias_medicamento FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- medicamentos (all auth read, admin+farmaceutico write)
CREATE POLICY "Auth read medicamentos" ON public.medicamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write medicamentos" ON public.medicamentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm write medicamentos" ON public.medicamentos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'farmaceutico')) WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'));

-- lotes
CREATE POLICY "Auth read lotes" ON public.lotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write lotes" ON public.lotes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm write lotes" ON public.lotes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'farmaceutico')) WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'));

-- movimentacoes (all auth read, most roles insert)
CREATE POLICY "Auth read movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'));
CREATE POLICY "Aux insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'auxiliar_farmacia'));
CREATE POLICY "Enf insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'enfermeiro'));

-- transferencias
CREATE POLICY "Auth read transferencias" ON public.transferencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage transferencias" ON public.transferencias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm manage transferencias" ON public.transferencias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'farmaceutico')) WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'));

-- fornecedores
CREATE POLICY "Auth read fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm manage fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'farmaceutico')) WITH CHECK (public.has_role(auth.uid(), 'farmaceutico'));

-- clinicas_parceiras
CREATE POLICY "Auth read clinicas" ON public.clinicas_parceiras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage clinicas" ON public.clinicas_parceiras FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- configuracoes_hospital
CREATE POLICY "Auth read config" ON public.configuracoes_hospital FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage config" ON public.configuracoes_hospital FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_log
CREATE POLICY "Admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Farm read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'farmaceutico'));
CREATE POLICY "Auth insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER set_updated_at_fornecedores BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_medicamentos BEFORE UPDATE ON public.medicamentos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_transferencias BEFORE UPDATE ON public.transferencias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- INDICES
-- =============================================

CREATE INDEX idx_medicamentos_codigo_barras ON public.medicamentos(codigo_barras);
CREATE INDEX idx_medicamentos_categoria ON public.medicamentos(categoria_id);
CREATE INDEX idx_medicamentos_ativo ON public.medicamentos(ativo);
CREATE INDEX idx_lotes_medicamento ON public.lotes(medicamento_id);
CREATE INDEX idx_lotes_validade ON public.lotes(validade);
CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes(tipo);
CREATE INDEX idx_movimentacoes_created ON public.movimentacoes(created_at);
CREATE INDEX idx_movimentacoes_medicamento ON public.movimentacoes(medicamento_id);
CREATE INDEX idx_transferencias_status ON public.transferencias(status);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

-- =============================================
-- STORAGE
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('notas_fiscais', 'notas_fiscais', false);

CREATE POLICY "Auth upload notas" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notas_fiscais');
CREATE POLICY "Auth read notas" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notas_fiscais');

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO public.categorias_medicamento (nome, cor) VALUES
  ('Psicotrópico', '#8b5cf6'),
  ('Antidepressivo', '#3b82f6'),
  ('Ansiolítico', '#10b981'),
  ('Antipsicótico', '#f59e0b'),
  ('Anticonvulsivante', '#ef4444'),
  ('Estabilizador de Humor', '#6366f1'),
  ('Outros', '#6b7280');

INSERT INTO public.configuracoes_hospital (nome, cnes, alerta_estoque_pct, alerta_vencimento_dias)
VALUES ('Hospital Psiquiátrico', '', 20, 60);
