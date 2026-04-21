import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { PainelAtrasos } from "@/components/PainelAtrasos";
import { Timer } from "lucide-react";

export default function PainelAtrasosPage() {
  return (
    <AppLayout title="Atrasos e Próximas">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Atrasos e Próximas Medicações"
          subtitle="Monitoramento em tempo real das medicações pendentes, atrasadas e próximas"
          icon={Timer}
          variant="default"
        />
        <PainelAtrasos />
      </div>
    </AppLayout>
  );
}
