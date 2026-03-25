import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const LeitorBarcode = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();

  const handleScan = async () => {
    if (!code.trim()) return;
    const { data } = await supabase.from("medicamentos").select("*, lotes(*)").eq("codigo_barras", code.trim()).eq("ativo", true).single();
    if (data) {
      setResult(data);
      toast.success(`Encontrado: ${data.nome}`);
    } else {
      setResult(null);
      toast.error("Medicamento não encontrado");
    }
  };

  return (
    <AppLayout title="Leitor de Código de Barras" subtitle="Escaneie ou digite o código">
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ScanLine className="h-5 w-5 text-primary" />Buscar por Código</div>
          <p className="text-xs text-muted-foreground">Digite o código de barras (EAN) ou utilize um leitor USB/câmera.</p>
          <div className="flex gap-2">
            <Input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScan()} placeholder="Ex: 7891234567890" className="font-mono" />
            <Button onClick={handleScan} className="gradient-primary text-primary-foreground shrink-0">Buscar</Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6 shadow-card space-y-3">
            <h3 className="font-semibold">{result.nome}</h3>
            <p className="text-sm text-muted-foreground">{result.generico} • {result.concentracao} • {result.forma_farmaceutica}</p>
            <div className="flex flex-wrap gap-2">
              {result.controlado && <Badge variant="outline" className="bg-primary/10 text-primary">Controlado</Badge>}
              <Badge variant="outline">Local: {result.localizacao}</Badge>
              <Badge variant="outline">Lotes: {result.lotes?.length || 0}</Badge>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/entrada")}>Registrar Entrada</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/dispensacao")}>Dispensar</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/etiquetas")}>Etiqueta</Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default LeitorBarcode;
