import { AppLayout } from "@/components/AppLayout";
import { Construction } from "lucide-react";

const ComingSoon = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AppLayout title={title} subtitle={subtitle}>
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <Construction className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium">Em desenvolvimento</p>
      <p className="text-sm mt-1">Esta funcionalidade estará disponível em breve.</p>
    </div>
  </AppLayout>
);

export const Movimentacoes = () => <ComingSoon title="Movimentações" subtitle="Registro de entradas e saídas" />;
export const Estoque = () => <ComingSoon title="Estoque" subtitle="Controle detalhado de inventário" />;
export const Configuracoes = () => <ComingSoon title="Configurações" subtitle="Ajustes do sistema" />;
