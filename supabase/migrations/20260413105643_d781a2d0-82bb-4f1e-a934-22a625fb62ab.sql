
ALTER TABLE public.itens_prescricao
  ADD COLUMN IF NOT EXISTS via text DEFAULT 'oral',
  ADD COLUMN IF NOT EXISTS dose text DEFAULT '',
  ADD COLUMN IF NOT EXISTS frequencia_horas integer,
  ADD COLUMN IF NOT EXISTS duracao_dias integer,
  ADD COLUMN IF NOT EXISTS instrucoes_preparo text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fracionamento boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dose_fracionada numeric,
  ADD COLUMN IF NOT EXISTS apresentacao_total numeric,
  ADD COLUMN IF NOT EXISTS sobra_reaproveitavel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estabilidade_horas integer;
