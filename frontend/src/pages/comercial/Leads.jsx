import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

const STATUS_CONFIG = {
  novo: { label: "Novo", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  qualificado: { label: "Qualificado", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  em_atendimento: { label: "Em Atendimento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  desqualificado: { label: "Desqualificado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", company: "",
  source: "manual", status: "novo", score: 50, notes: "",
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await axios.get(`${API}/leads`, { headers: getAuthHeader() });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const openCreate = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      source: lead.source || "manual",
      status: lead.status || "novo",
      score: lead.score || 50,
      notes: lead.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingLead) {
        await axios.put(`${API}/leads/${editingLead.lead_id}`, form, { headers: getAuthHeader() });
      } else {
        await axios.post(`${API}/leads`, form, { headers: getAuthHeader() });
      }
      await fetchLeads();
      setModalOpen(false);
    } catch (err) {
      console.error("Error saving lead:", err);
    }
    setSaving(false);
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Remover o lead "${lead.name}"?`)) return;
    try {
      await axios.delete(`${API}/leads/${lead.lead_id}`, { headers: getAuthHeader() });
      setLeads((prev) => prev.filter((l) => l.lead_id !== lead.lead_id));
    } catch (err) {
      console.error("Error deleting lead:", err);
    }
  };

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} cadastrado{leads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="create-lead-button">
          <Plus size={16} className="mr-2" />
          Novo Lead
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
            data-testid="leads-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="leads-status-filter">
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
            <Users size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Lead' para começar"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                return (
                  <TableRow key={lead.lead_id} data-testid={`lead-row-${lead.lead_id}`}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {lead.email || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {lead.company || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                      {SOURCES.find((s) => s.value === lead.source)?.label || lead.source}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-medium">{lead.score}</span>
                        <div className="w-12 bg-muted rounded-full h-1 hidden sm:block">
                          <div
                            className="bg-primary h-1 rounded-full"
                            style={{ width: `${lead.score || 0}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          onClick={() => openEdit(lead)}
                          data-testid={`edit-lead-${lead.lead_id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          onClick={() => handleDelete(lead)}
                          data-testid={`delete-lead-${lead.lead_id}`}
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
        <DialogContent className="sm:max-w-lg" data-testid="lead-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingLead ? "Editar Lead" : "Novo Lead"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                placeholder="Nome do lead"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="lead-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="lead-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                data-testid="lead-phone-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input
                placeholder="Nome da empresa"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                data-testid="lead-company-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Origem</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v })}
              >
                <SelectTrigger data-testid="lead-source-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger data-testid="lead-status-select">
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
              <Label className="text-sm font-medium">Score (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.score}
                onChange={(e) => setForm({ ...form, score: parseInt(e.target.value) || 0 })}
                data-testid="lead-score-input"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                placeholder="Anotações sobre o lead..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                data-testid="lead-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-testid="lead-modal-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              data-testid="lead-modal-save"
            >
              {saving ? "Salvando..." : editingLead ? "Salvar alterações" : "Criar lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
