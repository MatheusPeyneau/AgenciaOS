import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const STATUS_CONFIG = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pausado: { label: "Pausado", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const BILLING_TYPES = [
  { value: "BOLETO", label: "Boleto" },
  { value: "PIX", label: "PIX" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "TRANSFER", label: "Transferência" },
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", company: "",
  cpf_cnpj: "", status: "ativo", monthly_value: 0,
  billing_type: "BOLETO", start_date: "", due_date: "", notes: "",
};

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`, { headers: getAuthHeader() });
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      cpf_cnpj: client.cpf_cnpj || "",
      status: client.status || "ativo",
      monthly_value: client.monthly_value || 0,
      billing_type: client.billing_type || "BOLETO",
      start_date: client.start_date || "",
      due_date: client.due_date || "",
      notes: client.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.client_id}`, form, { headers: getAuthHeader() });
      } else {
        await axios.post(`${API}/clients`, form, { headers: getAuthHeader() });
      }
      await fetchClients();
      setModalOpen(false);
    } catch (err) {
      console.error("Error saving client:", err);
    }
    setSaving(false);
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Remover o cliente "${client.name}"?`)) return;
    try {
      await axios.delete(`${API}/clients/${client.client_id}`, { headers: getAuthHeader() });
      setClients((prev) => prev.filter((c) => c.client_id !== client.client_id));
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMRR = clients
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.filter((c) => c.status === "ativo").length} ativos &bull; MRR:{" "}
            {formatCurrency(totalMRR)}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="create-client-button">
          <Plus size={16} className="mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="clients-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="clients-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Cliente' para começar"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => {
                const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.ativo;
                return (
                  <TableRow key={client.client_id} data-testid={`client-row-${client.client_id}`}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {client.company || "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.monthly_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          onClick={() => openEdit(client)}
                          data-testid={`edit-client-${client.client_id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          onClick={() => handleDelete(client)}
                          data-testid={`delete-client-${client.client_id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="client-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                placeholder="Nome do cliente"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="client-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="email@cliente.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="client-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                data-testid="client-phone-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input
                placeholder="Nome da empresa"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                data-testid="client-company-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">CPF / CNPJ</Label>
              <Input
                placeholder="00.000.000/0001-00"
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                data-testid="client-cpfcnpj-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger data-testid="client-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">MRR (R$/mês)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.monthly_value}
                onChange={(e) =>
                  setForm({ ...form, monthly_value: parseFloat(e.target.value) || 0 })
                }
                data-testid="client-monthly-value-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo de Cobrança</Label>
              <Select
                value={form.billing_type}
                onValueChange={(v) => setForm({ ...form, billing_type: v })}
              >
                <SelectTrigger data-testid="client-billing-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Início do contrato</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                data-testid="client-start-date-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Vencimento da fatura</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                data-testid="client-due-date-input"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                placeholder="Informações adicionais sobre o cliente..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                data-testid="client-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} data-testid="client-modal-cancel">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              data-testid="client-modal-save"
            >
              {saving ? "Salvando..." : editingClient ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
