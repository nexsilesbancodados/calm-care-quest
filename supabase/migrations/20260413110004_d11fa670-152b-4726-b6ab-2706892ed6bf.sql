
-- Campos de unidade e conversão em medicamentos
ALTER TABLE public.medicamentos
  ADD COLUMN IF NOT EXISTS unidade_estoque text NOT NULL DEFAULT 'unidade',
  ADD COLUMN IF NOT EXISTS unidade_entrada text NOT NULL DEFAULT 'unidade',
  ADD COLUMN IF NOT EXISTS fator_conversao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ponto_pedido integer NOT NULL DEFAULT 0;

-- Tabela de Kits de Procedimento
CREATE TABLE IF NOT EXISTS public.kits_procedimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  filial_id uuid REFERENCES public.filiais(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kits_procedimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read kits" ON public.kits_procedimento
  FOR SELECT TO authenticated
  USING (is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Admin manage kits" ON public.kits_procedimento
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'admin') AND is_own_filial(auth.uid(), filial_id));

CREATE POLICY "Farm manage kits" ON public.kits_procedimento
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'farmaceutico') AND is_own_filial(auth.uid(), filial_id))
  WITH CHECK (has_role(auth.uid(), 'farmaceutico') AND is_own_filial(auth.uid(), filial_id));

CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON public.kits_procedimento
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Itens dos kits
CREATE TABLE IF NOT EXISTS public.kits_procedimento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits_procedimento(id) ON DELETE CASCADE,
  medicamento_id uuid NOT NULL REFERENCES public.medicamentos(id),
  quantidade integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kits_procedimento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read kit itens" ON public.kits_procedimento_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM kits_procedimento k WHERE k.id = kit_id AND is_own_filial(auth.uid(), k.filial_id)));

CREATE POLICY "Admin manage kit itens" ON public.kits_procedimento_itens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kits_procedimento k WHERE k.id = kit_id AND has_role(auth.uid(), 'admin') AND is_own_filial(auth.uid(), k.filial_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM kits_procedimento k WHERE k.id = kit_id AND has_role(auth.uid(), 'admin') AND is_own_filial(auth.uid(), k.filial_id)));

CREATE POLICY "Farm manage kit itens" ON public.kits_procedimento_itens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM kits_procedimento k WHERE k.id = kit_id AND has_role(auth.uid(), 'farmaceutico') AND is_own_filial(auth.uid(), k.filial_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM kits_procedimento k WHERE k.id = kit_id AND has_role(auth.uid(), 'farmaceutico') AND is_own_filial(auth.uid(), k.filial_id)));

-- Função para dar baixa em kit completo via FEFO
CREATE OR REPLACE FUNCTION public.baixa_kit_procedimento(_kit_id uuid, _usuario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _kit_nome text;
  _filial_id uuid;
  _item RECORD;
  _lote RECORD;
  _qtd_restante integer;
  _qtd_debit integer;
  _resultado jsonb := '[]'::jsonb;
  _total_itens integer := 0;
  _itens_ok integer := 0;
BEGIN
  SELECT nome, filial_id INTO _kit_nome, _filial_id
  FROM kits_procedimento WHERE id = _kit_id AND ativo = true;

  IF _kit_nome IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kit não encontrado ou inativo');
  END IF;

  FOR _item IN
    SELECT ki.medicamento_id, ki.quantidade, m.nome AS med_nome
    FROM kits_procedimento_itens ki
    JOIN medicamentos m ON m.id = ki.medicamento_id
    WHERE ki.kit_id = _kit_id
  LOOP
    _total_itens := _total_itens + 1;
    _qtd_restante := _item.quantidade;

    FOR _lote IN
      SELECT l.id, l.numero_lote, l.quantidade_atual
      FROM lotes l
      WHERE l.medicamento_id = _item.medicamento_id
        AND l.ativo = true AND l.quantidade_atual > 0
        AND l.validade > CURRENT_DATE
        AND (_filial_id IS NULL OR l.filial_id = _filial_id)
      ORDER BY l.validade ASC
    LOOP
      EXIT WHEN _qtd_restante <= 0;
      _qtd_debit := LEAST(_qtd_restante, _lote.quantidade_atual);

      UPDATE lotes SET quantidade_atual = quantidade_atual - _qtd_debit WHERE id = _lote.id;

      INSERT INTO movimentacoes (tipo, medicamento_id, lote_id, quantidade, usuario_id, observacao, filial_id)
      VALUES ('saida', _item.medicamento_id, _lote.id, _qtd_debit, _usuario_id,
              'Kit: ' || _kit_nome || ' — Lote ' || _lote.numero_lote, _filial_id);

      _qtd_restante := _qtd_restante - _qtd_debit;
    END LOOP;

    IF _qtd_restante <= 0 THEN _itens_ok := _itens_ok + 1; END IF;

    _resultado := _resultado || jsonb_build_object(
      'medicamento', _item.med_nome,
      'solicitado', _item.quantidade,
      'debitado', _item.quantidade - _qtd_restante,
      'faltou', _qtd_restante
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'kit', _kit_nome,
    'total_itens', _total_itens,
    'itens_completos', _itens_ok,
    'detalhes', _resultado
  );
END;
$$;

-- Função para verificar FEFO e impedir saída de lote mais novo
CREATE OR REPLACE FUNCTION public.validar_fefo(_medicamento_id uuid, _lote_id uuid, _filial_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lote_validade date;
  _fefo_lote_id uuid;
  _fefo_validade date;
  _fefo_numero text;
BEGIN
  SELECT validade INTO _lote_validade FROM lotes WHERE id = _lote_id;

  SELECT l.id, l.validade, l.numero_lote
  INTO _fefo_lote_id, _fefo_validade, _fefo_numero
  FROM lotes l
  WHERE l.medicamento_id = _medicamento_id
    AND l.ativo = true AND l.quantidade_atual > 0
    AND l.validade > CURRENT_DATE
    AND (_filial_id IS NULL OR l.filial_id = _filial_id)
  ORDER BY l.validade ASC
  LIMIT 1;

  IF _fefo_lote_id IS NOT NULL AND _fefo_lote_id != _lote_id AND _fefo_validade < _lote_validade THEN
    RETURN jsonb_build_object(
      'valido', false,
      'mensagem', 'FEFO: Existe o lote ' || _fefo_numero || ' com vencimento em ' || to_char(_fefo_validade, 'DD/MM/YYYY') || ' que deve ser utilizado primeiro.',
      'lote_sugerido_id', _fefo_lote_id,
      'lote_sugerido', _fefo_numero
    );
  END IF;

  RETURN jsonb_build_object('valido', true);
END;
$$;
