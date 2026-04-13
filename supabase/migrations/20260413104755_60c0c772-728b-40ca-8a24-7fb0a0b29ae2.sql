
CREATE OR REPLACE FUNCTION public.baixa_estoque_checklist(
  _item_prescricao_id uuid,
  _prescricao_id uuid,
  _usuario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _med_id uuid;
  _med_nome text;
  _lote_id uuid;
  _lote_num text;
  _filial_id uuid;
  _qty integer;
BEGIN
  -- Get medicamento from item
  SELECT ip.medicamento_id, m.nome
  INTO _med_id, _med_nome
  FROM itens_prescricao ip
  JOIN medicamentos m ON m.id = ip.medicamento_id
  WHERE ip.id = _item_prescricao_id;

  IF _med_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item de prescrição não encontrado');
  END IF;

  -- Get filial from prescricao
  SELECT filial_id INTO _filial_id
  FROM prescricoes WHERE id = _prescricao_id;

  -- FEFO: pick oldest expiring active lot with stock
  SELECT l.id, l.numero_lote, l.quantidade_atual
  INTO _lote_id, _lote_num, _qty
  FROM lotes l
  WHERE l.medicamento_id = _med_id
    AND l.ativo = true
    AND l.quantidade_atual > 0
    AND l.validade > CURRENT_DATE
    AND (_filial_id IS NULL OR l.filial_id = _filial_id)
  ORDER BY l.validade ASC
  LIMIT 1;

  IF _lote_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem lote disponível para ' || _med_nome);
  END IF;

  -- Deduct 1 unit
  UPDATE lotes SET quantidade_atual = quantidade_atual - 1 WHERE id = _lote_id;

  -- Record movement
  INSERT INTO movimentacoes (tipo, medicamento_id, lote_id, quantidade, usuario_id, prescricao_id, observacao, filial_id)
  VALUES ('saida', _med_id, _lote_id, 1, _usuario_id, _prescricao_id,
          'Baixa automática — Checklist MAR — Lote ' || _lote_num, _filial_id);

  RETURN jsonb_build_object(
    'success', true,
    'medicamento', _med_nome,
    'lote', _lote_num,
    'estoque_restante', _qty - 1
  );
END;
$$;
