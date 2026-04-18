// Centralized lazy page imports with prefetch support
const pages = {
  "/": () => import("@/pages/Dashboard"),
  "/medicamentos": () => import("@/pages/Medicamentos"),
  "/alertas": () => import("@/pages/Alertas"),
  "/movimentacoes": () => import("@/pages/Movimentacoes"),

  "/configuracoes": () => import("@/pages/Configuracoes"),
  "/etiquetas": () => import("@/pages/Etiquetas"),
  "/transferencias": () => import("@/pages/Transferencias"),
  "/fornecedores": () => import("@/pages/Fornecedores"),
  "/relatorios": () => import("@/pages/Relatorios"),
  "/entrada": () => import("@/pages/Entrada"),
  "/dispensacao": () => import("@/pages/Dispensacao"),
  "/leitor": () => import("@/pages/LeitorBarcode"),
  "/prescricoes": () => import("@/pages/Prescricoes"),
  "/usuarios": () => import("@/pages/Usuarios"),
  "/admin": () => import("@/pages/AdminPanel"),
  "/pacientes": () => import("@/pages/Pacientes"),
  "/inventario": () => import("@/pages/Inventario"),
  "/perfil": () => import("@/pages/Perfil"),
  "/solicitacoes": () => import("@/pages/Solicitacoes"),
  "/login": () => import("@/pages/Login"),
  "/reset-password": () => import("@/pages/ResetPassword"),
  "/mar": () => import("@/pages/AdministracaoMar"),
  "/seguranca": () => import("@/pages/SegurancaConta"),
  "/prontuario/:id": () => import("@/pages/Prontuario"),
  "/kits": () => import("@/pages/KitsProcedimento"),
  "/plantao": () => import("@/pages/PassagemPlantao"),
  "/atrasos": () => import("@/pages/PainelAtrasosPage"),
} as Record<string, () => Promise<any>>;

const prefetched = new Set<string>();

export function prefetchPage(path: string) {
  if (prefetched.has(path)) return;
  const loader = pages[path];
  if (loader) {
    prefetched.add(path);
    loader();
  }
}

export { pages };
