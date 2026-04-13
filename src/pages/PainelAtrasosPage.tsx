import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { PainelAtrasos } from "@/components/PainelAtrasos";
import { Timer } from "lucide-react";

export default function PainelAtrasosPage() {
  return (
    <AppLayout title="Painel de Atrasos">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Painel de Atrasos"
          subtitle="Monitoramento em tempo real das medicações pendentes e atrasadas"
          icon={Timer}
          variant="default"
        />
        <PainelAtrasos />
      </div>
    </AppLayout>
  );
}
