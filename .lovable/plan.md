

# PharmaControl — Plano de Reconstrução Completa

## Estado Atual
O projeto possui 12 tabelas Supabase (medications, patients, movements, suppliers, etc.) com RLS permissiva (anon), autenticação mock via localStorage, e páginas funcionais mas sem autenticação real nem RBAC. O schema atual não corresponde ao solicitado (faltam tabelas de lotes, clínicas parceiras, e o modelo de dados é diferente).

---

## Plano de Implementação

### Fase 1 — Novo Schema de Banco de Dados

**Migration 1: Limpar tabelas existentes e criar novo schema**

Tabelas a criar (todas com RLS + soft delete via campo `ativo`):

| Tabela | Colunas principais |
|--------|-------------------|
| `profiles` | id, user_id (FK auth.users), nome, papel (enum: admin/farmaceutico/auxiliar_farmacia/enfermeiro/visualizador), ativo, avatar_url, created_at |
| `user_roles` | id, user_id, role (enum app_role) — para RBAC com security definer |
| `medicamentos` | id, nome, generico, principio_ativo, concentracao, forma_farmaceutica, codigo_barras, categoria, controlado, fornecedor_id, estoque_minimo, estoque_maximo, localizacao, preco_unitario, ativo |
| `lotes` | id, medicamento_id, numero_lote, validade, quantidade_atual, preco_unitario, ativo |
| `movimentacoes` | id, tipo (enum), medicamento_id, lote_id, quantidade, usuario_id, paciente, prontuario, setor, nota_fiscal, observacao, created_at |
| `transferencias` | id, medicamento_id, lote_id, quantidade, clinica_origem_id, clinica_destino_id, status (enum), solicitante_id, aprovador_id, urgencia, observacao, created_at, updated_at |
| `fornecedores` | id, nome, cnpj, contato, email, telefone, endereco, ativo |
| `clinicas_parceiras` | id, nome, cnes, endereco, contato, telefone, ativo |
| `audit_log` | id, usuario_id, acao, tabela, registro_id, dados_anteriores (jsonb), dados_novos (jsonb), created_at |
| `configuracoes_hospital` | id, nome, cnes, logo_url, alerta_estoque_pct, alerta_vencimento_dias |
| `categorias_medicamento` | id, nome, cor, ativo |

**Enums**: `app_role`, `tipo_movimentacao` (entrada/saida/transferencia/ajuste), `status_transferencia` (pendente/aprovado/enviado/recebido/cancelado)

**Security definer function**: `has_role(uuid, app_role)` para uso em RLS sem recursão

**RLS por papel**:
- `admin`: ALL em todas as tabelas
- `farmaceutico`: ALL em medicamentos/lotes/movimentacoes/transferencias, SELECT em profiles/audit_log
- `auxiliar_farmacia`: INSERT em movimentacoes (tipo=entrada), SELECT em medicamentos/lotes
- `enfermeiro`: SELECT em medicamentos/lotes, INSERT em movimentacoes (tipo=saida/dispensação)
- `visualizador`: SELECT only em medicamentos/lotes/movimentacoes

**Trigger**: auto-create profile on signup, updated_at triggers

**Índices**: codigo_barras, medicamento_id em lotes, tipo+created_at em movimentacoes

**Migration 2**: Criar storage bucket `notas_fiscais` (público: false) com RLS

---

### Fase 2 — Autenticação Real com Supabase Auth

**Arquivos a criar/reescrever:**

1. **`src/contexts/AuthContext.tsx`** — Substituir mock por Supabase Auth real
   - `onAuthStateChange` listener + `getSession`
   - Login com email/senha via `supabase.auth.signInWithPassword`
   - Signup via `supabase.auth.signUp` (admin cria usuários)
   - Logout via `supabase.auth.signOut`
   - Carregar profile + role do banco
   - Função `can(permission)` baseada no papel real do banco
   - Função `hasRole(role)` para checks rápidos

2. **`src/pages/Login.tsx`** — Reescrever com Supabase Auth
   - Email + senha real
   - "Esqueci minha senha" com `resetPasswordForEmail`
   - Visual hospitalar (azul escuro #1e3a5f)

3. **`src/pages/ResetPassword.tsx`** — Nova página para reset de senha
   - Detectar `type=recovery` no URL hash
   - Formulário para nova senha
   - Rota pública

4. **`src/components/ProtectedRoute.tsx`** — Usar session real do Supabase

---

### Fase 3 — Reescrita dos Módulos (Páginas)

Todas as páginas serão reescritas para usar o novo schema. Cada página usa React Query para fetch/mutate, loading skeletons, paginação, e respeita o papel do usuário.

1. **Dashboard** — KPIs via queries agregadas (COUNT de lotes por status, SUM de quantidades), gráficos Recharts (consumo 30 dias, top 10, pizza por categoria), alertas reais

2. **Estoque de Medicamentos** — CRUD completo de medicamentos + lotes, filtros avançados, leitor de código de barras (html5-qrcode), badges de status, histórico de movimentações por item

3. **Entrada de Medicamentos** — Formulário de recebimento com NF, upload de arquivo para storage, busca por nome ou scan de barcode, criação de lotes

4. **Saída/Dispensação** — Dispensação para paciente (nome, prontuário), saída por setor, baixa automática no lote, histórico filtrável

5. **Transferências** — Solicitação com fluxo de aprovação (pendente→aprovado→enviado→recebido), badge de pendentes no sidebar, filtro por status

6. **Leitor de Código de Barras** — Página dedicada com câmera via html5-qrcode, modal de ações rápidas ao escanear

7. **Impressão de Etiquetas** — Templates 3 tamanhos, react-barcode para renderizar EAN, CSS @media print, preview e impressão em lote

8. **Relatórios** — 6 tipos de relatório com filtros, export CSV e PDF (via window.print + HTML formatado)

9. **Gerenciamento de Usuários** (admin) — Listagem, criar/editar/desativar, atribuir papéis, log de auditoria por usuário

10. **Configurações** (admin) — CRUD fornecedores, clínicas parceiras, categorias, alertas, info do hospital

---

### Fase 4 — Design e UX

- **Paleta**: azul escuro (#1e3a5f) primário, branco, verde (#22c55e) sucesso, amarelo warning, vermelho destructive
- **Sidebar**: ícones + labels, badge de alertas/transferências pendentes, collapse em mobile (hamburguer)
- **Dark mode**: via ThemeProvider existente
- **Loading skeletons**: em todas as listagens
- **Framer Motion**: transições de página
- **Responsivo**: mobile-first, tabelas com scroll horizontal

---

### Fase 5 — Segurança e Auditoria

- Todas as mutações registram em `audit_log` (dados anteriores + novos via trigger ou app-level)
- Soft delete em tudo (campo `ativo = false`, nunca DELETE)
- RLS em todas as tabelas sem exceção
- Nenhuma rota acessível sem session ativa

---

## Ordem de Execução

1. Migration SQL (drop old tables, create new schema, RLS, triggers, índices)
2. Auth context + Login + ProtectedRoute + ResetPassword
3. Sidebar + AppLayout (com papel do usuário)
4. Dashboard
5. Medicamentos + Lotes (CRUD)
6. Entrada de Medicamentos
7. Saída/Dispensação
8. Transferências (com fluxo de aprovação)
9. Leitor de Código de Barras
10. Etiquetas
11. Relatórios
12. Gerenciamento de Usuários
13. Configurações
14. Ajustes de design, dark mode, responsividade

## Dependências NPM a adicionar
- `html5-qrcode` (leitor de câmera)
- `react-barcode` (geração de código de barras)

As dependências existentes (recharts, framer-motion, react-query, shadcn/ui, react-router-dom) já atendem o restante.

