export type AppRole = "admin" | "farmaceutico" | "auxiliar_farmacia" | "enfermeiro" | "visualizador";
export type TipoMovimentacao = "entrada" | "saida" | "transferencia" | "ajuste" | "dispensacao";
export type StatusTransferencia = "pendente" | "aprovado" | "enviado" | "recebido" | "cancelado";
export type StatusPrescricao = "ativa" | "parcialmente_dispensada" | "totalmente_dispensada" | "vencida" | "cancelada";

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
  filial_id: string | null;
  role: AppRole;
  filial?: Filial;
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

export interface Medicamento {
  id: string;
  nome: string;
  generico: string;
  principio_ativo: string;
  concentracao: string;
  forma_farmaceutica: string;
  codigo_barras: string | null;
  categoria_id: string | null;
  controlado: boolean;
  fornecedor_id: string | null;
  estoque_minimo: number;
  estoque_maximo: number;
  localizacao: string;
  preco_unitario: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  categoria?: Categoria;
  fornecedor?: Fornecedor;
  lotes?: Lote[];
  estoque_total?: number;
}

export interface Lote {
  id: string;
  medicamento_id: string;
  numero_lote: string;
  validade: string;
  quantidade_atual: number;
  preco_unitario: number;
  ativo: boolean;
  created_at: string;
}

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  medicamento_id: string | null;
  lote_id: string | null;
  quantidade: number;
  usuario_id: string | null;
  paciente: string | null;
  prontuario: string | null;
  setor: string | null;
  nota_fiscal: string | null;
  observacao: string;
  prescricao_id: string | null;
  created_at: string;
  medicamento?: Medicamento;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  telefone: string;
  endereco: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicaParceira {
  id: string;
  nome: string;
  cnes: string;
  endereco: string;
  contato: string;
  telefone: string;
  ativo: boolean;
  created_at: string;
}

export interface Filial {
  id: string;
  nome: string;
  cnpj: string;
  cnes: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  responsavel: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transferencia {
  id: string;
  medicamento_id: string | null;
  lote_id: string | null;
  quantidade: number;
  clinica_origem_id: string | null;
  clinica_destino_id: string | null;
  status: StatusTransferencia;
  solicitante_id: string | null;
  aprovador_id: string | null;
  urgencia: boolean;
  observacao: string;
  created_at: string;
  updated_at: string;
  medicamento?: Medicamento;
  clinica_origem?: ClinicaParceira;
  clinica_destino?: ClinicaParceira;
}

export interface ConfigHospital {
  id: string;
  nome: string;
  cnes: string;
  logo_url: string | null;
  alerta_estoque_pct: number;
  alerta_vencimento_dias: number;
}

export interface AuditEntry {
  id: string;
  usuario_id: string | null;
  acao: string;
  tabela: string;
  registro_id: string | null;
  dados_anteriores: any;
  dados_novos: any;
  created_at: string;
}

export interface Prescricao {
  id: string;
  numero_receita: string;
  paciente: string;
  prontuario: string | null;
  medico: string;
  crm: string | null;
  setor: string | null;
  data_prescricao: string;
  validade_dias: number;
  status: StatusPrescricao;
  observacao: string;
  usuario_id: string | null;
  created_at: string;
  updated_at: string;
  itens?: ItemPrescricao[];
}

export interface ItemPrescricao {
  id: string;
  prescricao_id: string;
  medicamento_id: string;
  quantidade_prescrita: number;
  quantidade_dispensada: number;
  posologia: string;
  created_at: string;
  medicamento?: Medicamento;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  farmaceutico: "Farmacêutico",
  auxiliar_farmacia: "Auxiliar de Farmácia",
  enfermeiro: "Enfermeiro",
  visualizador: "Visualizador",
};

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ["*"],
  farmaceutico: ["manage_stock", "manage_batches", "manage_movements", "approve_transfers", "print_labels", "view_reports", "manage_suppliers"],
  auxiliar_farmacia: ["add_entry", "read_stock", "scan_barcode"],
  enfermeiro: ["read_stock", "request_meds", "register_admin"],
  visualizador: ["read_stock", "view_basic_reports"],
};

export const PRESCRICAO_STATUS_CONFIG: Record<StatusPrescricao, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-success/10 text-success border-success/20" },
  parcialmente_dispensada: { label: "Parcial", className: "bg-warning/10 text-warning border-warning/20" },
  totalmente_dispensada: { label: "Dispensada", className: "bg-info/10 text-info border-info/20" },
  vencida: { label: "Vencida", className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground border-muted" },
};

export function getEstoqueTotal(lotes: Lote[]): number {
  return lotes.filter(l => l.ativo).reduce((sum, l) => sum + l.quantidade_atual, 0);
}

export function getEstoqueStatus(total: number, minimo: number): "normal" | "baixo" | "critico" | "esgotado" {
  if (total === 0) return "esgotado";
  if (minimo > 0 && total <= minimo * 0.25) return "critico";
  if (minimo > 0 && total <= minimo) return "baixo";
  return "normal";
}

export const ESTOQUE_STATUS_CONFIG = {
  normal: { label: "Normal", className: "bg-success/10 text-success border-success/20" },
  baixo: { label: "Baixo", className: "bg-warning/10 text-warning border-warning/20" },
  critico: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20" },
  esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground border-muted" },
};
