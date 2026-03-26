import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart2, Users, Plus, Trash2, CheckCircle2, LayoutDashboard,
  Loader2, UserPlus, Check, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

const ROLE_LABELS = { manager: "Gestor", analyst: "Analista", designer: "Designer" };
const ROLE_COLORS = {
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  analyst: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  designer: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, size = "sm" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={cn("rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0", sz)}>
      {getInitials(name)}
    </div>
  );
}

function ServicePills({ services }) {
  const active = [
    services?.meta_ads && "Meta",
    services?.google_ads && "Google",
    services?.auto_reports && "Relatórios",
    services?.alerts && "Alertas",
  ].filter(Boolean);
  if (active.length === 0) return <span className="text-xs text-muted-foreground">Sem serviços ativos</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((s) => (
        <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
          {s}
        </span>
      ))}
    </div>
  );
}

function ClientSummaryCard({ item, collaborators, onNavigate }) {
  const { client, responsible_collaborator, task_summary, services } = item;
  const { total = 0, done = 0, todo = 0, overdue = 0 } = task_summary || {};

  const [responsible, setResponsible] = useState(responsible_collaborator || null);
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAssign = async (collab) => {
    if (collab?.collaborator_id === responsible?.collaborator_id) { setOpen(false); return; }
    setAssigning(true);
    try {
      if (responsible) {
        await axios.delete(`${API}/clients/${client.client_id}/collaborators/${responsible.collaborator_id}`, { headers: getAuthHeader() });
      }
      await axios.post(`${API}/clients/${client.client_id}/collaborators`, { collaborator_id: collab.collaborator_id, role: "responsible" }, { headers: getAuthHeader() });
      setResponsible(collab);
      toast.success(`${collab.name} definido como responsável`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao atribuir responsável");
    }
    setAssigning(false);
    setOpen(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-all" data-testid={`summary-card-${client.client_id}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-base truncate">{client.name}</p>
          <p className="text-xs text-muted-foreground truncate">{client.company || client.email || "—"}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          R$ {(client.monthly_value || 0).toLocaleString("pt-BR")}
        </span>
      </div>

      {/* Responsible — interactive selector */}
      <div ref={ref} className="relative">
        <button
          onClick={() => collaborators.length > 0 && setOpen((o) => !o)}
          disabled={assigning || collaborators.length === 0}
          data-testid={`responsible-selector-${client.client_id}`}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
            collaborators.length > 0
              ? "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
              : "border-dashed border-border/60 cursor-default opacity-60"
          )}
        >
          {assigning ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
          ) : responsible ? (
            <Avatar name={responsible.name} />
          ) : (
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
              <UserPlus size={12} className="text-muted-foreground/50" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {responsible ? (
              <>
                <p className="text-xs font-medium leading-tight truncate">{responsible.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[responsible.role] || responsible.role}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {collaborators.length === 0 ? "Cadastre colaboradores na equipe" : "Atribuir responsável"}
              </p>
            )}
          </div>

          {collaborators.length > 0 && (
            <ChevronDown size={13} className={cn("text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
          )}
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {collaborators.map((c) => (
              <button
                key={c.collaborator_id}
                onClick={() => handleAssign(c)}
                data-testid={`assign-responsible-${c.collaborator_id}`}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <Avatar name={c.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[c.role] || c.role}</p>
                </div>
                {responsible?.collaborator_id === c.collaborator_id && (
                  <Check size={13} className="text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task summary */}
      <div className="border border-border rounded-lg p-3 space-y-1.5 bg-muted/20">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} /> {done} concluídas
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full border-2 border-muted-foreground/40" /> {todo} a fazer
          </span>
          {overdue > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
              ⚠ {overdue} atrasada{overdue !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all"
            style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : "0%" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{total} tarefa{total !== 1 ? "s" : ""} total</p>
      </div>

      {/* Services */}
      <ServicePills services={services} />

      {/* Action */}
      <Button
        size="sm"
        className="w-full gap-2"
        onClick={() => onNavigate(client.client_id)}
        data-testid={`dashboard-btn-${client.client_id}`}
      >
        <LayoutDashboard size={14} />
        Ver Dashboard
      </Button>
    </div>
  );
}

function CollaboratorModal({ open, onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "analyst" });
  const [saving, setSaving] = useState(false);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/collaborators`, { headers: getAuthHeader() });
      setCollaborators(res.data);
    } catch { toast.error("Erro ao carregar colaboradores"); }
    setLoading(false);
  };

  useEffect(() => { if (open) fetchCollaborators(); }, [open]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/collaborators`, form, { headers: getAuthHeader() });
      setForm({ name: "", email: "", role: "analyst" });
      toast.success("Colaborador adicionado!");
      await fetchCollaborators();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao criar colaborador");
    }
    setSaving(false);
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.delete(`${API}/collaborators/${id}`, { headers: getAuthHeader() });
      setCollaborators((prev) => prev.filter((c) => c.collaborator_id !== id));
      toast.success("Colaborador removido");
    } catch { toast.error("Erro ao remover colaborador"); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="team-modal">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Users size={16} /> Gerenciar Equipe
          </DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input
                placeholder="Nome do colaborador"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="collab-name-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="email@agencia.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="collab-email-input"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="collab-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim()} data-testid="collab-add-btn">
              <Plus size={14} className="mr-1" /> Adicionar
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="border-t border-border pt-3 max-h-60 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhum colaborador cadastrado</p>
          ) : collaborators.map((c) => (
            <div key={c.collaborator_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <Avatar name={c.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.email || "—"}</p>
              </div>
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", ROLE_COLORS[c.role])}>
                {ROLE_LABELS[c.role] || c.role}
              </span>
              <button
                onClick={() => handleDeactivate(c.collaborator_id)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                data-testid={`deactivate-collab-${c.collaborator_id}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Operacional() {
  const [summary, setSummary] = useState([]);
  const [managers, setManagers] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [selectedManager, setSelectedManager] = useState("all");
  const [loading, setLoading] = useState(true);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (managerId = "all") => {
    setLoading(true);
    try {
      const url = managerId !== "all"
        ? `${API}/operational/summary?manager_id=${managerId}`
        : `${API}/operational/summary`;
      const [summaryRes, managersRes, allCollabsRes] = await Promise.all([
        axios.get(url, { headers: getAuthHeader() }),
        axios.get(`${API}/collaborators?role=manager`, { headers: getAuthHeader() }),
        axios.get(`${API}/collaborators`, { headers: getAuthHeader() }),
      ]);
      setSummary(summaryRes.data);
      setManagers(managersRes.data);
      setAllCollaborators(allCollabsRes.data);
    } catch (err) {
      console.error("Error fetching operational summary:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleManagerChange = (value) => {
    setSelectedManager(value);
    fetchData(value);
    localStorage.setItem("agenciaos_manager_filter", value);
  };

  useEffect(() => {
    const saved = localStorage.getItem("agenciaos_manager_filter");
    if (saved) { setSelectedManager(saved); fetchData(saved); }
    else fetchData();
  }, []);

  const totalTasks = summary.reduce((sum, item) => sum + (item.task_summary?.total || 0), 0);
  const totalDone = summary.reduce((sum, item) => sum + (item.task_summary?.done || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Operacional</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.length} cliente{summary.length !== 1 ? "s" : ""} &bull; {totalDone}/{totalTasks} tarefas concluídas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Manager filter */}
          <Select value={selectedManager} onValueChange={handleManagerChange}>
            <SelectTrigger className="w-48" data-testid="manager-filter">
              <SelectValue placeholder="Todos os gestores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gestores</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.collaborator_id} value={m.collaborator_id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setTeamModalOpen(true)} data-testid="manage-team-btn">
            <Users size={15} className="mr-2" />
            Gerenciar Equipe
          </Button>
          <Button variant="outline" onClick={() => navigate("/clientes")} data-testid="new-client-btn">
            <Plus size={15} className="mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {summary.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={44} className="text-muted-foreground opacity-30 mb-4" />
          <p className="text-base font-medium">
            {selectedManager !== "all" ? "Nenhum cliente atribuído a este gestor" : "Nenhum cliente ativo"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {selectedManager !== "all"
              ? "Atribua clientes ao gestor na página do dashboard do cliente."
              : "Cadastre clientes para ver os dashboards operacionais."}
          </p>
          {selectedManager !== "all" ? (
            <Button variant="outline" onClick={() => handleManagerChange("all")} data-testid="clear-manager-filter">
              Ver todos os clientes
            </Button>
          ) : (
            <Button onClick={() => navigate("/clientes")} data-testid="empty-add-client">
              <Plus size={15} className="mr-2" /> Cadastrar primeiro cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {summary.map((item) => (
            <ClientSummaryCard
              key={item.client.client_id}
              item={item}
              collaborators={allCollaborators}
              onNavigate={(clientId) => navigate(`/operacional/${clientId}`)}
            />
          ))}
        </div>
      )}

      <CollaboratorModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        onCollaboratorsChanged={() => fetchData(selectedManager)}
      />
    </div>
  );
}
