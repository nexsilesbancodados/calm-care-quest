import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Building2, Phone, Mail, MapPin, Star, StarOff,
  Package, Calendar, FileText, Pill, Clock, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface OrderHistory {
  id: string;
  date: string;
  items: string;
  quantity: number;
  status: "entregue" | "pendente" | "em_trânsito";
  nf?: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  rating: number;
  active: boolean;
  lastOrder: string;
  notes: string;
  medicationIds: string[];
  avgDeliveryDays: number;
  orders: OrderHistory[];
}

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  entregue: { label: "Entregue", className: "bg-success/10 text-success border-success/20" },
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  "em_trânsito": { label: "Em Trânsito", className: "bg-info/10 text-info border-info/20" },
};

const initialSuppliers: Supplier[] = [
  { id: "S001", name: "Cristália Produtos Químicos", cnpj: "44.734.671/0001-51", contact: "Roberto Faria", phone: "(11) 4835-5000", email: "vendas@cristalia.com.br", address: "Itapira, SP", category: "Injetáveis / Psicotrópicos", rating: 5, active: true, lastOrder: "2026-03-17", notes: "Fornecedor principal de Haloperidol e Clorpromazina", medicationIds: ["2", "6"], avgDeliveryDays: 3, orders: [
    { id: "O1", date: "2026-03-17", items: "Haloperidol 5mg/ml", quantity: 100, status: "entregue", nf: "NF 45892" },
    { id: "O2", date: "2026-02-20", items: "Clorpromazina 25mg/5ml", quantity: 50, status: "entregue", nf: "NF 44521" },
  ] },
  { id: "S002", name: "EMS S/A", cnpj: "57.507.378/0001-65", contact: "Mariana Lopes", phone: "(19) 3887-9800", email: "institucional@ems.com.br", address: "Hortolândia, SP", category: "Genéricos", rating: 4, active: true, lastOrder: "2026-03-10", notes: "Risperidona genérica - melhor preço", medicationIds: ["1"], avgDeliveryDays: 5, orders: [
    { id: "O3", date: "2026-03-10", items: "Risperidona 2mg", quantity: 500, status: "entregue", nf: "NF 12340" },
  ] },
  { id: "S003", name: "Medley Farmacêutica", cnpj: "10.588.595/0001-89", contact: "Paulo Andrade", phone: "(19) 3876-5000", email: "vendas@medley.com.br", address: "Campinas, SP", category: "Genéricos / Antidepressivos", rating: 4, active: true, lastOrder: "2026-03-15", notes: "Fluoxetina, Sertralina", medicationIds: ["3", "8"], avgDeliveryDays: 4, orders: [
    { id: "O4", date: "2026-03-15", items: "Fluoxetina 20mg", quantity: 500, status: "entregue", nf: "NF 45670" },
  ] },
  { id: "S004", name: "Roche Brasil", cnpj: "33.009.945/0002-04", contact: "Fernanda Costa", phone: "(11) 3719-7000", email: "vendas@roche.com.br", address: "São Paulo, SP", category: "Ansiolíticos", rating: 5, active: true, lastOrder: "2026-03-12", notes: "Clonazepam (Rivotril), Diazepam", medicationIds: ["4", "10"], avgDeliveryDays: 2, orders: [
    { id: "O5", date: "2026-03-12", items: "Clonazepam 2mg, Diazepam 10mg", quantity: 300, status: "entregue", nf: "NF 33210" },
    { id: "O6", date: "2026-03-20", items: "Clonazepam 2mg", quantity: 200, status: "em_trânsito" },
  ] },
  { id: "S005", name: "Eurofarma", cnpj: "61.190.096/0001-92", contact: "André Silveira", phone: "(11) 5908-4000", email: "vendas@eurofarma.com.br", address: "Itapevi, SP", category: "Estabilizadores", rating: 4, active: true, lastOrder: "2026-03-08", notes: "Carbonato de Lítio - contrato anual", medicationIds: ["5"], avgDeliveryDays: 6, orders: [] },
  { id: "S006", name: "Sanofi-Aventis", cnpj: "02.685.377/0001-57", contact: "Lucia Mendes", phone: "(11) 3759-6000", email: "vendas@sanofi.com.br", address: "São Paulo, SP", category: "Hipnóticos", rating: 3, active: false, lastOrder: "2026-01-20", notes: "Zolpidem - atraso na última entrega, avaliar continuidade", medicationIds: ["7"], avgDeliveryDays: 12, orders: [] },
  { id: "S007", name: "Novartis Brasil", cnpj: "56.994.502/0001-30", contact: "Ricardo Lima", phone: "(11) 5532-7000", email: "vendas@novartis.com.br", address: "São Paulo, SP", category: "Anticonvulsivantes", rating: 4, active: true, lastOrder: "2026-02-28", notes: "Carbamazepina (Tegretol)", medicationIds: ["11"], avgDeliveryDays: 5, orders: [] },
];

const Fornecedores = () => {
  const { medications } = useMedicationContext();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", contact: "", phone: "", email: "", address: "", category: "", rating: 4, notes: "", avgDeliveryDays: 5 });
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);

  const filtered = useMemo(() => suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase())
  ), [suppliers, search]);

  const openNew = () => { setEditSupplier(null); setForm({ name: "", cnpj: "", contact: "", phone: "", email: "", address: "", category: "", rating: 4, notes: "", avgDeliveryDays: 5 }); setSelectedMedIds([]); setDialogOpen(true); };

  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ name: s.name, cnpj: s.cnpj, contact: s.contact, phone: s.phone, email: s.email, address: s.address, category: s.category, rating: s.rating, notes: s.notes, avgDeliveryDays: s.avgDeliveryDays });
    setSelectedMedIds(s.medicationIds);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editSupplier) {
      setSuppliers((prev) => prev.map((s) => s.id === editSupplier.id ? { ...s, ...form, medicationIds: selectedMedIds, active: true } : s));
      toast.success("Fornecedor atualizado!");
    } else {
      setSuppliers((prev) => [{ id: `S${String(prev.length + 1).padStart(3, "0")}`, ...form, medicationIds: selectedMedIds, active: true, lastOrder: "—", orders: [] }, ...prev]);
      toast.success("Fornecedor cadastrado!");
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => setSuppliers((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));

  const toggleMedId = (id: string) => {
    setSelectedMedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const activeCount = suppliers.filter((s) => s.active).length;

  const getMedNames = (ids: string[]) => ids.map((id) => medications.find((m) => m.id === id)).filter(Boolean).map((m) => `${m!.name} ${m!.dosage}`);

  return (
    <AppLayout title="Fornecedores" subtitle={`${suppliers.length} fornecedores • ${activeCount} ativos`}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: suppliers.length, icon: Building2, v: "default" },
          { label: "Ativos", value: activeCount, icon: Package, v: "success" },
          { label: "Inativos", value: suppliers.length - activeCount, icon: StarOff, v: "warning" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", { "bg-primary/10 text-primary": s.v === "default", "bg-success/10 text-success": s.v === "success", "bg-warning/10 text-warning": s.v === "warning" })}>
                <s.icon className="h-4 w-4" />
              </div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, categoria ou contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={cn("p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer", !s.active && "opacity-50")} onClick={() => setDetailSupplier(s)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{s.cnpj}</p>
                </div>
                <Badge variant="outline" className={cn("text-[9px] shrink-0 ml-2", s.active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground")}>
                  {s.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <Badge variant="outline" className="text-[10px] mb-2">{s.category}</Badge>

              {/* Medications supplied */}
              {s.medicationIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {getMedNames(s.medicationIds).slice(0, 3).map((name) => (
                    <Badge key={name} variant="secondary" className="text-[9px] bg-primary/5 text-primary">{name}</Badge>
                  ))}
                  {s.medicationIds.length > 3 && <Badge variant="secondary" className="text-[9px]">+{s.medicationIds.length - 3}</Badge>}
                </div>
              )}

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{s.phone}</div>
                <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span></div>
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" />Prazo médio: {s.avgDeliveryDays} dias</div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className={cn("h-3 w-3", idx < s.rating ? "text-warning fill-warning" : "text-muted")} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {s.orders.length > 0 ? `${s.orders.length} pedidos` : "Sem pedidos"}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailSupplier} onOpenChange={(open) => !open && setDetailSupplier(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          {detailSupplier && (
            <>
              <DialogHeader><DialogTitle>{detailSupplier.name}</DialogTitle></DialogHeader>
              <Tabs defaultValue="info" className="mt-2">
                <TabsList>
                  <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
                  <TabsTrigger value="medicamentos" className="text-xs gap-1"><Pill className="h-3 w-3" /> Medicamentos</TabsTrigger>
                  <TabsTrigger value="pedidos" className="text-xs gap-1"><ShoppingCart className="h-3 w-3" /> Pedidos</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground block">CNPJ</span><span className="font-mono">{detailSupplier.cnpj}</span></div>
                    <div><span className="text-xs text-muted-foreground block">Contato</span>{detailSupplier.contact}</div>
                    <div><span className="text-xs text-muted-foreground block">Telefone</span>{detailSupplier.phone}</div>
                    <div><span className="text-xs text-muted-foreground block">E-mail</span>{detailSupplier.email}</div>
                    <div><span className="text-xs text-muted-foreground block">Endereço</span>{detailSupplier.address}</div>
                    <div><span className="text-xs text-muted-foreground block">Prazo Médio</span>{detailSupplier.avgDeliveryDays} dias</div>
                  </div>
                  {detailSupplier.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">{detailSupplier.notes}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setDetailSupplier(null); openEdit(detailSupplier); }}>Editar</Button>
                    <Button variant={detailSupplier.active ? "destructive" : "outline"} size="sm" onClick={() => { toggleActive(detailSupplier.id); setDetailSupplier(null); }}>
                      {detailSupplier.active ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="medicamentos" className="mt-3">
                  <p className="text-xs text-muted-foreground mb-3">Medicamentos fornecidos por {detailSupplier.name}:</p>
                  {detailSupplier.medicationIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum medicamento vinculado</p>
                  ) : (
                    <div className="space-y-2">
                      {getMedNames(detailSupplier.medicationIds).map((name) => (
                        <div key={name} className="flex items-center gap-2 rounded-lg border p-3">
                          <Pill className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pedidos" className="mt-3">
                  {detailSupplier.orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido registrado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Itens</TableHead>
                          <TableHead className="text-xs text-center">Qtd</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">NF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailSupplier.orders.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="text-xs">{new Date(o.date).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-xs">{o.items}</TableCell>
                            <TableCell className="text-xs text-center font-medium">{o.quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[9px]", orderStatusConfig[o.status]?.className)}>{orderStatusConfig[o.status]?.label}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{o.nf || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Contato</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">E-mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Avaliação</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <button key={idx} type="button" onClick={() => setForm({ ...form, rating: idx + 1 })} className="p-0.5">
                      <Star className={cn("h-5 w-5 transition-colors", idx < form.rating ? "text-warning fill-warning" : "text-muted hover:text-warning/50")} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prazo Médio (dias)</Label>
                <Input type="number" min={1} value={form.avgDeliveryDays} onChange={(e) => setForm({ ...form, avgDeliveryDays: Number(e.target.value) })} />
              </div>
            </div>

            {/* Medication Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamentos Fornecidos</Label>
              <div className="max-h-[150px] overflow-y-auto rounded-lg border p-2 space-y-1">
                {medications.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 cursor-pointer text-sm">
                    <Checkbox checked={selectedMedIds.includes(m.id)} onCheckedChange={() => toggleMedId(m.id)} />
                    {m.name} {m.dosage}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5"><Label className="text-xs font-medium">Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{editSupplier ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Fornecedores;
