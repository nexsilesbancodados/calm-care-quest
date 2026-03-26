

# Plano de Implementação — PsiRumoCerto: Completar Sistema

## Visão Geral
9 seções de melhorias abrangendo correções críticas, nova página de Prescrições, melhorias em Dispensação, Dashboard, Relatórios, Leitor de Barcode, UX geral, e Sidebar. Nenhuma alteração no design system, auth, componentes UI ou theme.

---

## Fase 1: Migration SQL (uma única migration)

Criar tabelas `prescricoes` e `itens_prescricao`, adicionar coluna `prescricao_id` em `movimentacoes`, adicionar valor `'ajuste'` ao enum `tipo_movimentacao` (se não existir), e criar RLS policies para as novas tabelas.

```text
prescricoes
├── id, numero_receita, paciente, prontuario, medico, crm, setor
├── data_prescricao, validade_dias, status, observacao
├── usuario_id, created_at, updated_at

itens_prescricao
├── id, prescricao_id (FK), medicamento_id (FK)
├── quantidade_prescrita, quantidade_dispensada, posologia

movimentacoes
└── + prescricao_id (FK nullable)
```

RLS: authenticated read all; admin/farmaceutico/enfermeiro manage prescricoes e itens.

**Nota**: Usar validation trigger em vez de CHECK constraint para o campo `status` (conforme diretrizes).

---

## Fase 2: Correções Críticas (Seções 1a, 1b, 1c)

### 1a. Dispensação — validação server-side
**Arquivo**: `src/pages/Dispensacao.tsx`
- No `handleSubmit`, antes de fazer UPDATE no lote, fazer `SELECT quantidade_atual FROM lotes WHERE id = form.lote_id` fresco.
- Se `quantidade_atual < form.quantidade`, mostrar toast com estoque real e abortar.

### 1b. Transferências — campo de lote
**Arquivo**: `src/pages/Transferencias.tsx`
- Carregar lotes junto com medicamentos no `fetchData`.
- No dialog de nova transferência, após selecionar medicamento, mostrar Select de lotes disponíveis (com número, validade, quantidade).
- Salvar `lote_id` na inserção. Mostrar coluna "Lote" na tabela de listagem.

### 1c. Ajuste de estoque
**Arquivo**: `src/pages/Estoque.tsx`
- Adicionar botão "Ajustar" por linha de medicamento na tabela.
- Dialog com: Select de lote, campo quantidade nova, Select de motivo (Inventário/Perda/Vencimento/Erro/Outro), observação obrigatória.
- Salvar movimentação tipo `"ajuste"`, atualizar `quantidade_atual` do lote, registrar audit_log com dados anteriores/novos.

---

## Fase 3: Página Prescrições (Seção 2)

**Novo arquivo**: `src/pages/Prescricoes.tsx`

Componentes da página:
- **Lista** com busca (paciente/número/médico), filtro por status, badges coloridos por estado.
- **Dialog "Nova Prescrição"**: campos numero_receita, paciente, prontuário, médico, CRM, setor, data, validade_dias, observação.
- **Dialog "Adicionar Itens"**: buscar medicamento, definir quantidade e posologia.
- **Dialog "Dispensar Prescrição"**: modal que lista itens pendentes, aplica FEFO automático (lote mais antigo com estoque), registra movimentações com `prescricao_id`, atualiza `quantidade_dispensada` e status da prescrição.
- Coluna de progresso: "2/3 itens dispensados".

**Tipos**: Adicionar `Prescricao` e `ItemPrescricao` em `src/types/database.ts`.

---

## Fase 4: Melhorias na Dispensação (Seção 3)

**Arquivo**: `src/pages/Dispensacao.tsx`

- **FEFO automático**: Ao selecionar medicamento, ordenar lotes por validade ascendente, pré-selecionar o primeiro. Badge de aviso se trocar para lote mais novo.
- **Campo Prescrição**: Select opcional com busca por número/paciente. Se selecionada, preencher paciente/prontuário/setor automaticamente. Salvar `prescricao_id` na movimentação.
- **Histórico aprimorado**: Adicionar colunas "Prescrição" e "Paciente". Filtro por data e busca por paciente/prontuário. Carregar dados de prescrição via join.

---

## Fase 5: Melhorias no Dashboard (Seção 4)

**Arquivo**: `src/pages/Dashboard.tsx`

- **Filtro de período** no gráfico de consumo: Select com opções (7d, 30d, 90d, Este mês, Mês anterior). Atualizar query dinamicamente.
- **StatCard CMM**: Calcular média de dispensações nos últimos 3 meses. Ícone TrendingUp.
- **StatCard Prescrições Ativas**: Query count de prescricoes com status='ativa'. Clicável → /prescricoes.

---

## Fase 6: Melhorias nos Relatórios (Seção 5)

**Arquivo**: `src/pages/Relatorios.tsx`

- **Tab "Psicotrópicos"**: Listar medicamentos com `controlado=true` + lotes. Colunas: medicamento, concentração, forma, lote, qtd inicial (via movimentações entrada), entradas/saídas no período, saldo, validade. Filtro mês/ano. CSV/Print adaptados. Nota ANVISA.
- **Tab "CMM por Medicamento"**: Lista com nome, CMM (média 3 meses), estoque atual, cobertura em dias, status colorido (verde >30d, amarelo 15-30d, vermelho <15d).
- **printReport melhorado**: Buscar `configuracoes_hospital.nome` para cabeçalho. Adicionar rodapé com nome do usuário e timestamp.

---

## Fase 7: Leitor de Barcode (Seção 6)

**Arquivo**: `src/pages/LeitorBarcode.tsx`
- Nos botões de ação pós-resultado, passar `?medicamento_id={id}` como query param para Dispensar, Entrada, Ver Estoque, Imprimir Etiqueta.
- Adicionar botão "Ver Estoque" → `/estoque?search={codigo_barras}`.

**Arquivos receptores**: `Dispensacao.tsx`, `Entrada.tsx`, `Etiquetas.tsx`, `Estoque.tsx`
- Ler `useSearchParams()` para `medicamento_id`. Pré-selecionar o medicamento correspondente no carregamento.

---

## Fase 8: Melhorias UX (Seção 7)

### Confirmação destrutiva
- **Medicamentos.tsx**: No `handleDeactivate`, fazer query de lotes ativos antes. Mostrar AlertDialog com "X lotes ativos, Y unidades em estoque. Continuar?".
- **Fornecedores.tsx**: No `toggleActive`, contar medicamentos vinculados. Mostrar AlertDialog similar.

### Paginação server-side
- **Medicamentos.tsx**: PAGE_SIZE=50. Usar `.range(from, to)` do Supabase. Controles de página com total de registros. Count via `{ count: "exact", head: true }`.
- **Fornecedores.tsx**: PAGE_SIZE=30, mesmo padrão.

### FEFO visual no Estoque
- **Estoque.tsx**: Na expansão dos lotes, marcar com badge "FEFO" o lote com menor validade futura (não vencido) de cada medicamento.

---

## Fase 9: Sidebar + Routing (Seção 8)

**Arquivo**: `src/components/AppSidebar.tsx`
- Adicionar item `{ title: "Prescrições", url: "/prescricoes", icon: FileText, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: "prescricoes" }` na lista `allItems`.
- Adicionar contagem de prescrições ativas ao `badgeCounts` (query `prescricoes` com `status='ativa'`).

**Arquivo**: `src/App.tsx`
- Importar `Prescricoes` e adicionar rota `/prescricoes` com `<P>`.

**Arquivo**: `src/types/database.ts`
- Adicionar interfaces `Prescricao` e `ItemPrescricao`.
- Adicionar `prescricao_id` à interface `Movimentacao`.

---

## Resumo de Arquivos Afetados

| Arquivo | Tipo |
|---|---|
| Migration SQL | Novo |
| `src/pages/Prescricoes.tsx` | Novo |
| `src/types/database.ts` | Editar |
| `src/pages/Dispensacao.tsx` | Editar |
| `src/pages/Transferencias.tsx` | Editar |
| `src/pages/Estoque.tsx` | Editar |
| `src/pages/Dashboard.tsx` | Editar |
| `src/pages/Relatorios.tsx` | Editar |
| `src/pages/LeitorBarcode.tsx` | Editar |
| `src/pages/Medicamentos.tsx` | Editar |
| `src/pages/Fornecedores.tsx` | Editar |
| `src/pages/Entrada.tsx` | Editar |
| `src/pages/Etiquetas.tsx` | Editar |
| `src/components/AppSidebar.tsx` | Editar |
| `src/App.tsx` | Editar |

Nenhuma alteração em: design system, AuthContext, ProtectedRoute, shadcn/ui, ThemeProvider, CommandPalette, AppLayout.

