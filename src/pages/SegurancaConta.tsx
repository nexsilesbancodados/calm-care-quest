import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, ShieldCheck, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { challengeAndVerify, enrollTotp, getAal, listFactors, unenroll } from "@/lib/auth/mfa";

type Factor = { id: string; friendly_name: string | null; factor_type: string; status: string };

export default function SegurancaConta() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [aal, setAal] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    try {
      const fs = await listFactors();
      setFactors([...(fs.totp ?? [])] as Factor[]);
      setAal(await getAal());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar fatores");
    }
  }

  async function iniciarEnroll() {
    try {
      const data = await enrollTotp();
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no enroll");
    }
  }

  async function confirmar() {
    if (!enrolling) return;
    try {
      await challengeAndVerify(enrolling.id, code.trim());
      toast.success("MFA ativado");
      setEnrolling(null);
      setCode("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Código inválido");
    }
  }

  async function remover(id: string) {
    try {
      await unenroll(id);
      toast.success("Fator removido");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  }

  return (
    <AppLayout title="Segurança da Conta">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Segurança da Conta"
          subtitle="Autenticação em duas etapas (TOTP). Obrigatória para perfis admin e farmacêutico."
          icon={Lock}
          variant="security"
        />

        <Card>
          <CardHeader>
            <CardTitle>Nível de autenticação atual</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={aal === "aal2" ? "default" : "outline"}>
              <ShieldCheck className="mr-1 h-4 w-4" /> {aal ?? "—"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fatores TOTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {factors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum fator cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {factors.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>{f.friendly_name ?? f.factor_type}</span>
                      <Badge variant="outline">{f.status}</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => remover(f.id)}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!enrolling ? (
              <Button onClick={iniciarEnroll}>Adicionar autenticador</Button>
            ) : (
              <div className="space-y-3 rounded border p-4">
                <p className="text-sm">Leia o QR no seu app autenticador (Authy, Google Authenticator):</p>
                <div
                  className="bg-white p-2"
                  aria-label="QR code TOTP"
                  dangerouslySetInnerHTML={{ __html: enrolling.qr }}
                />
                <p className="break-all text-xs text-muted-foreground">
                  Ou digite manualmente: {enrolling.secret}
                </p>
                <Label htmlFor="code">Código de 6 dígitos</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={confirmar}>Confirmar</Button>
                  <Button variant="outline" onClick={() => setEnrolling(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
