
-- Add 'devolucao' to the tipo_movimentacao enum
ALTER TYPE public.tipo_movimentacao ADD VALUE IF NOT EXISTS 'devolucao';
