

# Analise Completa dos Modulos do PsiFarma - Plano de Melhorias

## Diagnostico por Modulo

### 1. Login & Autenticacao
**Estado atual:** Mock authentication com localStorage. Qualquer credencial loga como admin.
**Problemas:**
- Sem validacao de senha real (aceita qualquer credential como demo)
- Sem protecao de rotas (paginas acessiveis sem login)
- Sem sessao expiravel

**Melhorias propostas:**
- Adicionar ProtectedRoute que redireciona para /login se nao autenticado
- Validar credenciais mock corretamente (rejeitar senhas erradas)
- Adicionar pagina de "esqueci minha senha" (UI pronta para futuro backend)

---

### 2. Dashboard
**Estado atual:** Completo com stats, graficos, atividade recente e alertas rapidos.
**Problemas:**
- Dados do grafico semanal sao gerados com `Math.random()` (muda a cada render)
- Atividade recente e hardcoded, nao reflete acoes reais do usuario

**Melhorias propostas:**
- Fixar dados do grafico com seed ou useMemo para nao flicker
- Adicionar indicador de tendencia (seta verde/vermelha comparando com semana anterior)
- Adicionar widget de "Tarefas do dia" (conferencias, reposicoes pendentes)

---

### 3. Medicamentos
**Estado atual:** CRUD funcional com busca, filtros e detalhe.
**Problemas:**
- Falta paginacao (todos os medicamentos renderizam de uma vez)
- Nao ha ordenacao por coluna na tabela

**Melhorias propostas:**
- Adicionar ordenacao clicavel nas colunas (nome, estoque, validade)
- Adicionar paginacao com 20 itens por pagina
- Adicionar importacao em massa via CSV

---

### 4. Pacientes & Prescricoes
**Estado atual:** Lista com detalhe, adicao de prescricoes, toggle ativo/inativo.
**Problemas:**
- Nao da para cadastrar novos pacientes (apenas visualizar os mock)
- Nao ha vinculo real entre prescricao e estoque (dispensar nao reduz estoque)
- Falta historico de evolucao do paciente

**Melhorias propostas:**
- Adicionar formulario de cadastro de novo paciente
- Vincular dispensacao de prescricao com reducao de estoque
- Adicionar aba de "Evolucao" com timeline de eventos clinicos

---

### 5. Alertas
**Estado atual:** Lista simples de alertas derivados dos dados mock.
**Problemas:**
- Sem acoes nos alertas (nao da para marcar como resolvido ou ignorar)
- Sem filtro por tipo de alerta
- Sem prioridade visual clara

**Melhorias propostas:**
- Adicionar filtros por tipo (esgotado, critico, validade, vencido)
- Adicionar botoes de acao: "Solicitar Reposicao", "Marcar como Resolvido"
- Adicionar contador no sidebar (badge com numero de alertas ativos)

---

### 6. Movimentacoes
**Estado atual:** Tabela com filtros e formulario de registro.
**Problemas:**
- Registrar movimentacao nao atualiza o estoque real do medicamento
- Sem validacao (pode dispensar mais do que o estoque disponivel)

**Melhorias propostas:**
- Vincular movimentacoes ao estoque (entrada soma, saida/dispensacao subtrai)
- Validar quantidade disponivel antes de permitir saida/dispensacao
- Adicionar campo de data editavel (hoje vem automatico, mas pode precisar retroagir)

---

### 7. Estoque
**Estado atual:** Visualizacao com graficos e mapa de localizacao.
**Problemas:**
- Somente leitura — nao ha como ajustar estoque manualmente
- Sem filtros na visualizacao

**Melhorias propostas:**
- Adicionar botao de "Ajuste de Inventario" para correcoes manuais
- Adicionar filtros por categoria e localizacao
- Adicionar funcao de "Contagem Fisica" com checklist

---

### 8. Transferencias
**Estado atual:** Completo com filiais, status e formulario de criacao.
**Problemas:**
- Transferencia nao afeta o estoque real
- Sem confirmacao de recebimento pelo destino

**Melhorias propostas:**
- Vincular transferencias ao estoque (saida na origem, entrada no destino ao confirmar)
- Adicionar fluxo de confirmacao: Pendente -> Em Transito -> Recebido (com assinatura)

---

### 9. Fornecedores
**Estado atual:** CRUD com cards, avaliacao por estrelas.
**Problemas:**
- Sem vinculo entre fornecedor e medicamento (qual fornece o que)
- Sem historico de pedidos

**Melhorias propostas:**
- Adicionar relacao fornecedor <-> medicamentos fornecidos
- Adicionar aba de "Historico de Pedidos" por fornecedor
- Adicionar campo de prazo medio de entrega

---

### 10. Etiquetas
**Estado atual:** Geracao e impressao com barcode/QR.
**Problemas:** Modulo bem completo. Pequeno issue: o print com barcode usa logica complexa de ID que pode falhar.

**Melhorias propostas:**
- Melhorar preview com visualizacao mais fiel ao impresso
- Adicionar template de etiqueta personalizavel

---

### 11. Relatorios
**Estado atual:** Filtros, graficos, exportacao CSV/Excel/PDF.
**Problemas:**
- Dados sao todos mock, fluxo mensal e hardcoded

**Melhorias propostas:**
- Adicionar relatorio de "Consumo por Paciente"
- Adicionar relatorio de "Vencimentos Proximos" com cronograma

---

### 12. Configuracoes
**Estado atual:** Configuracoes gerais, alertas, seguranca, gestao de usuarios.
**Problemas:** Salvar configuracoes nao persiste (localStorage bastaria para demo)

**Melhorias propostas:**
- Persistir configuracoes no localStorage
- Adicionar aba de "Log de Auditoria" (visivel apenas para admin)

---

## Prioridade Recomendada de Implementacao

Sugiro implementar as melhorias em 3 fases. Escolha qual fase deseja comecar:

**Fase 1 — Integridade do Sistema (mais impacto)**
1. Protecao de rotas (ProtectedRoute)
2. Vincular movimentacoes ao estoque (entrada/saida atualiza quantidade)
3. Cadastro de novos pacientes
4. Acoes nos alertas (resolver, solicitar reposicao)
5. Badge de alertas no sidebar

**Fase 2 — Usabilidade**
6. Paginacao e ordenacao na tabela de medicamentos
7. Filtros na pagina de alertas
8. Ajuste manual de inventario no estoque
9. Persistir configuracoes no localStorage
10. Fixar dados aleatorios do dashboard

**Fase 3 — Recursos Avancados**
11. Log de auditoria
12. Relacao fornecedor <-> medicamentos
13. Importacao CSV de medicamentos
14. Relatorio de consumo por paciente
15. Timeline de evolucao do paciente

