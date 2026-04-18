-- Adiciona classificação de tipo de item (medicamento, material, EPI, higiene)
ALTER TABLE public.medicamentos
ADD COLUMN IF NOT EXISTS tipo_item text NOT NULL DEFAULT 'medicamento';

-- Restringe valores permitidos
ALTER TABLE public.medicamentos
DROP CONSTRAINT IF EXISTS medicamentos_tipo_item_check;

ALTER TABLE public.medicamentos
ADD CONSTRAINT medicamentos_tipo_item_check
CHECK (tipo_item IN ('medicamento', 'material', 'epi', 'higiene'));

-- Índice para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_medicamentos_tipo_item
ON public.medicamentos (tipo_item) WHERE ativo = true;

COMMENT ON COLUMN public.medicamentos.tipo_item IS 'Tipo do item: medicamento, material (gaze, seringa, soro), epi (máscara, luva, avental), higiene (álcool, sabão, fralda)';