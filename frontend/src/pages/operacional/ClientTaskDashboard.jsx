import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2, Users, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { API, getAuthHeader, STATUS_CFG, PRIORITY_CFG, formatMinutes, getInitials } from "./taskConfig";
import { SortableTaskRow, TaskRow } from "./TaskRow";
import { CommentsDrawer } from "./CommentsDrawer";

// ——— Time Log Modal ———
function TimeLogModal({ task, open, onClose, onLogged }) {
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const mins = parseInt(minutes);
    if (!mins || mins <= 0) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/tasks/${task.task_id}/time`, { minutes: mins, note: note || null }, { headers: getAuthHeader() });
      onLogged(task.task_id, res.data.tracked_minutes);
      toast.success(`${formatMinutes(mins)} registrado`);
      setMinutes(""); setNote(""); onClose();
    } catch { toast.error("Erro ao registrar tempo"); }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs" data-testid="time-log-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-sm">Registrar Tempo</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2 truncate">{task?.title}</p>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Minutos *</Label>
            <Input type="number" min={1} placeholder="Ex: 30" value={minutes} onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus data-testid="time-minutes-input" />
            {minutes && parseInt(minutes) > 0 && <p className="text-xs text-muted-foreground">= {formatMinutes(parseInt(minutes))}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nota (opcional)</Label>
            <Input placeholder="O que foi feito?" value={note} onChange={(e) => setNote(e.target.value)} data-testid="time-note-input" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !minutes || parseInt(minutes) <= 0} data-testid="time-save-btn">
            {submitting ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ——— Add Task Inline Row ———
function AddTaskRow({ onAdd }) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const handleAdd = () => {
    if (!title.trim()) { setActive(false); return; }
    onAdd(title.trim(), null);
    setTitle(""); setActive(false);
  };
  if (!active) {
    return (
      <button onClick={() => setActive(true)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-10 py-2 w-full border-b border-border hover:bg-muted/20 transition-colors" data-testid="add-task-inline">
        <Plus size={13} /> Adicionar Tarefa
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 px-10 py-2 border-b border-border bg-muted/20">
      <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleAdd}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setActive(false); setTitle(""); } }}
        placeholder="Nome da tarefa..." autoFocus className="flex-1 text-sm bg-transparent outline-none" data-testid="inline-task-input" />
      <Button size="sm" variant="ghost" onClick={handleAdd} className="h-6 px-2 text-xs">Salvar</Button>
    </div>
  );
}

// ——— Client Team Modal ———
function ClientTeamModal({ open, onClose, clientId }) {
  const [allCollabs, setAllCollabs] = useState([]);
  const [clientCollabs, setClientCollabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRole, setSelectedRole] = useState("responsible");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, cc] = await Promise.all([
        axios.get(`${API}/collaborators`, { headers: getAuthHeader() }),
        axios.get(`${API}/clients/${clientId}/collaborators`, { headers: getAuthHeader() }),
      ]);
      setAllCollabs(all.data);
      setClientCollabs(cc.data);
    } catch {}
    setLoading(false);
  }, [clientId]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      await axios.post(`${API}/clients/${clientId}/collaborators`, { collaborator_id: selectedId, role: selectedRole }, { headers: getAuthHeader() });
      toast.success("Colaborador atribuído!");
      await fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao atribuir"); }
  };

  const handleRemove = async (collabId) => {
    try {
      await axios.delete(`${API}/clients/${clientId}/collaborators/${collabId}`, { headers: getAuthHeader() });
      setClientCollabs((prev) => prev.filter((c) => c.collaborator_id !== collabId));
    } catch { toast.error("Erro ao remover"); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm" data-testid="client-team-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-sm flex items-center gap-2"><Users size={15} /> Equipe do Cliente</DialogTitle>
        </DialogHeader>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Colaborador</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger data-testid="assign-collab-select"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>{allCollabs.map((c) => <SelectItem key={c.collaborator_id} value={c.collaborator_id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label className="text-xs">Função</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responsible">Responsável</SelectItem>
                <SelectItem value="support">Apoio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAssign} disabled={!selectedId} data-testid="assign-btn"><Plus size={13} /></Button>
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto mt-1">
          {loading ? <Loader2 size={16} className="animate-spin mx-auto text-muted-foreground" /> :
           clientCollabs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Nenhum colaborador atribuído</p> :
           clientCollabs.map((cc) => (
            <div key={cc.collaborator_id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold">{getInitials(cc.collaborator?.name || "")}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{cc.collaborator?.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{cc.role === "responsible" ? "Responsável" : "Apoio"}</p>
              </div>
              <button onClick={() => handleRemove(cc.collaborator_id)} className="text-muted-foreground hover:text-destructive transition-colors"><X size={13} /></button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ——— Main Dashboard ———
export default function ClientTaskDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [subtasksMap, setSubtasksMap] = useState({});
  const [collaborators, setCollaborators] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [drawerTask, setDrawerTask] = useState(null);
  const [timeLogTask, setTimeLogTask] = useState(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [search, setSearch] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/clients/${clientId}/tasks`, { headers: getAuthHeader() });
      setTasks(res.data);
    } catch {}
  }, [clientId]);

  const fetchSubtasks = useCallback(async (parentTaskId) => {
    try {
      const res = await axios.get(`${API}/clients/${clientId}/tasks?parent_task_id=${parentTaskId}`, { headers: getAuthHeader() });
      setSubtasksMap((prev) => ({ ...prev, [parentTaskId]: res.data }));
    } catch {}
  }, [clientId]);

  const toggleExpand = useCallback((taskId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); fetchSubtasks(taskId); }
      return next;
    });
  }, [fetchSubtasks]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clientRes, tasksRes, collabsRes] = await Promise.all([
          axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeader() }),
          axios.get(`${API}/clients/${clientId}/tasks`, { headers: getAuthHeader() }),
          axios.get(`${API}/collaborators`, { headers: getAuthHeader() }),
        ]);
        setClient(clientRes.data);
        setTasks(tasksRes.data);
        setCollaborators(collabsRes.data);
      } catch (err) {
        if (err.response?.status === 404) navigate("/operacional");
      }
      setLoading(false);
    })();
  }, [clientId, navigate]);

  const handleUpdate = useCallback(async (taskId, fields) => {
    setTasks((prev) => prev.map((t) => t.task_id === taskId ? { ...t, ...fields } : t));
    setSubtasksMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { next[k] = next[k].map((t) => t.task_id === taskId ? { ...t, ...fields } : t); });
      return next;
    });
    try {
      const res = await axios.patch(`${API}/tasks/${taskId}`, fields, { headers: getAuthHeader() });
      setTasks((prev) => prev.map((t) => t.task_id === taskId ? { ...t, ...res.data } : t));
    } catch { toast.error("Erro ao atualizar tarefa"); await fetchTasks(); }
  }, [fetchTasks]);

  const handleDelete = useCallback(async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { headers: getAuthHeader() });
      toast.success("Tarefa removida");
    } catch { toast.error("Erro ao remover tarefa"); await fetchTasks(); }
  }, [fetchTasks]);

  const handleAddTask = useCallback(async (title, parentTaskId) => {
    try {
      const res = await axios.post(`${API}/clients/${clientId}/tasks`, { title, parent_task_id: parentTaskId }, { headers: getAuthHeader() });
      if (parentTaskId) {
        setSubtasksMap((prev) => ({ ...prev, [parentTaskId]: [...(prev[parentTaskId] || []), res.data] }));
        setTasks((prev) => prev.map((t) => t.task_id === parentTaskId ? { ...t, subtask_count: (t.subtask_count || 0) + 1 } : t));
      } else {
        setTasks((prev) => [...prev, res.data]);
      }
    } catch { toast.error("Erro ao criar tarefa"); }
  }, [clientId]);

  const handleApplyTemplate = async () => {
    setApplyingTemplate(true);
    try {
      const res = await axios.post(`${API}/clients/${clientId}/tasks/apply-template`, {}, { headers: getAuthHeader() });
      setTasks(res.data);
      toast.success(`${res.data.length} tarefas do template aplicadas!`);
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao aplicar template"); }
    setApplyingTemplate(false);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex((t) => t.task_id === active.id);
    const newIdx = tasks.findIndex((t) => t.task_id === over.id);
    const reordered = arrayMove(tasks, oldIdx, newIdx).map((t, i) => ({ ...t, position: i }));
    setTasks(reordered);
    try {
      await axios.patch(`${API}/tasks/reorder`, { tasks: reordered.map((t) => ({ task_id: t.task_id, position: t.position })) }, { headers: getAuthHeader() });
    } catch { toast.error("Erro ao reordenar"); await fetchTasks(); }
  };

  const handleTimeLogged = useCallback((taskId, newTracked) => {
    setTasks((prev) => prev.map((t) => t.task_id === taskId ? { ...t, tracked_minutes: newTracked } : t));
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/operacional")} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0" data-testid="back-btn">
              <ArrowLeft size={16} className="text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-heading font-bold truncate">{client?.name}</h1>
              <p className="text-xs text-muted-foreground">{client?.company || client?.email || "Dashboard Operacional"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setTeamModalOpen(true)} data-testid="client-team-btn">
              <Users size={14} className="mr-1.5" /> Equipe
            </Button>
            {tasks.length === 0 && (
              <Button size="sm" variant="outline" onClick={handleApplyTemplate} disabled={applyingTemplate} data-testid="apply-template-btn">
                {applyingTemplate ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Sparkles size={13} className="mr-1.5" />}
                Aplicar Template
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="font-medium text-foreground">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""}</span>
          <span>{doneCount} concluída{doneCount !== 1 ? "s" : ""}</span>
          <div className="flex-1 max-w-xs bg-muted rounded-full h-1.5 hidden sm:block">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: tasks.length > 0 ? `${Math.round((doneCount / tasks.length) * 100)}%` : "0%" }} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa..."
            className="text-xs pl-3 pr-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary w-44"
            data-testid="task-search" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-xs w-36" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-7 text-xs w-36" data-testid="filter-priority"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {Object.entries(PRIORITY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-7 text-xs w-40" data-testid="filter-assignee"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {collaborators.map((c) => <SelectItem key={c.collaborator_id} value={c.collaborator_id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterStatus !== "all" || filterPriority !== "all" || filterAssignee !== "all" || search) && (
            <button onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterAssignee("all"); setSearch(""); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
              data-testid="clear-filters-btn">
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {/* Column headers */}
        <div className="flex items-center gap-0 border-b border-border bg-muted/30 sticky top-0 z-10">
          <div className="w-8 shrink-0" />
          <div className="w-32 shrink-0 px-1.5 py-2 text-xs font-medium text-muted-foreground">Status</div>
          <div className="flex-1 min-w-0 px-1.5 py-2 text-xs font-medium text-muted-foreground">Tarefa</div>
          <div className="w-16 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Resp.</div>
          <div className="w-24 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Data ini.</div>
          <div className="w-24 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Vencimento</div>
          <div className="w-20 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Estimativa</div>
          <div className="w-24 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Prioridade</div>
          <div className="w-20 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">Tempo</div>
          <div className="w-12 shrink-0 px-1 py-2 text-xs font-medium text-muted-foreground text-center">💬</div>
          <div className="w-8 shrink-0" />
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {tasks.length === 0 ? "Nenhuma tarefa ainda" : "Nenhuma tarefa com esses filtros"}
            </p>
            {tasks.length === 0 && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <p className="text-xs text-muted-foreground">Adicione tarefas manualmente ou aplique o template padrão da agência</p>
                <Button size="sm" variant="outline" onClick={handleApplyTemplate} disabled={applyingTemplate} data-testid="empty-apply-template-btn">
                  <Sparkles size={13} className="mr-1.5" /> Aplicar Template da Agência
                </Button>
              </div>
            )}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredTasks.map((t) => t.task_id)} strategy={verticalListSortingStrategy}>
              {filteredTasks.map((task) => (
                <SortableTaskRow
                  key={task.task_id}
                  task={task}
                  subtasks={subtasksMap[task.task_id] || []}
                  collaborators={collaborators}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onAddSubtask={(parentId) => handleAddTask("Nova subtarefa", parentId)}
                  onOpenComments={setDrawerTask}
                  onLogTime={setTimeLogTask}
                  depth={0}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        <AddTaskRow onAdd={handleAddTask} />
      </div>

      <CommentsDrawer task={drawerTask} open={!!drawerTask} onClose={() => setDrawerTask(null)} />
      {timeLogTask && <TimeLogModal task={timeLogTask} open={!!timeLogTask} onClose={() => setTimeLogTask(null)} onLogged={handleTimeLogged} />}
      <ClientTeamModal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} clientId={clientId} />
    </div>
  );
}
