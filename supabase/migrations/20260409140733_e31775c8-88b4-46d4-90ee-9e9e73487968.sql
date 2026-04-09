
-- Limpar na ordem correta (respeitando dependências)
TRUNCATE TABLE 
  itens_prescricao,
  movimentacoes,
  transferencias,
  solicitacoes_medicamentos,
  notificacoes,
  prescricoes,
  lotes,
  medicamentos,
  fornecedores,
  pacientes,
  audit_log,
  clinicas_parceiras
CASCADE;
