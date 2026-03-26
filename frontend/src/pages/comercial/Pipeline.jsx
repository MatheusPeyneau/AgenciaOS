import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GripVertical, Trash2, Kanban, Settings2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const EMPTY_DEAL = { title: "", value: 0, stage_id: "", contact_name: "", company: "", probability: 50, notes: "" };

// ——— Draggable deal card (Kanban board) ———
function DealCard({ deal, isOverlay = false, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.deal_id, data: { deal } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={cn(
        "bg-background border border-border p-3.5 rounded-md cursor-grab active:cursor-grabbing group",
        isDragging && "opacity-40",
        isOverlay && "shadow-xl opacity-100 rotate-1"
      )}
      data-testid={`deal-card-${deal.deal_id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold text-sm leading-tight flex-1">{deal.title}</p>
        <div className="flex items-center gap-1">
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(deal); }}
            data-testid={`delete-deal-${deal.deal_id}`}
          >
            <Trash2 size={12} />
          </button>
          <GripVertical size={14} className="text-muted-foreground shrink-0" />
        </div>
      </div>
      {deal.company && <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>}
      {deal.contact_name && <p className="text-xs text-muted-foreground">{deal.contact_name}</p>}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <p className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-12 bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full" style={{ width: `${deal.probability || 50}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{deal.probability || 50}%</span>
        </div>
      </div>
    </div>
  );
}

// ——— Droppable column (Kanban board) ———
function DroppableColumn({ stage, deals, onAddDeal, onDeleteDeal }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.stage_id });
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div
      className={cn(
        "w-[290px] shrink-0 flex flex-col gap-3 bg-muted/30 border border-border p-4 rounded-lg transition-all",
        isOver && "bg-muted/60 border-primary/40 ring-1 ring-primary/20"
      )}
      data-testid={`kanban-column-${stage.stage_id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="font-heading font-semibold text-sm">{stage.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{deals.length}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</span>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2.5 min-h-[80px]">
        {deals.map((deal) => (
          <DealCard key={deal.deal_id} deal={deal} onDelete={onDeleteDeal} />
        ))}
      </div>
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 px-2 py-1.5 rounded-md hover:bg-muted/50 w-full"
        onClick={() => onAddDeal(stage.stage_id)}
        data-testid={`add-deal-${stage.stage_id}`}
      >
        <Plus size={13} />
        Adicionar deal
      </button>
    </div>
  );
}

// ——— Sortable stage row (Edit modal) ———
function SortableStageRow({ stage, deals, onRename, onDeleteDeal }) {
  const [name, setName] = useState(stage.name);
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.stage_id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const commitRename = () => {
    if (name.trim() && name !== stage.name) onRename(stage.stage_id, name.trim());
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg border border-border bg-muted/20 overflow-hidden", isDragging && "opacity-50 z-50")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button {...listeners} {...attributes} className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </button>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            autoFocus
            className="flex-1 h-7 text-sm"
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
            onClick={() => setEditing(true)}
            data-testid={`rename-stage-${stage.stage_id}`}
          >
            {name}
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {deals.length} deal{deals.length !== 1 ? "s" : ""}
        </span>
      </div>
      {deals.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {deals.map((deal) => (
            <div
              key={deal.deal_id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-background rounded border border-border text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{deal.title}</p>
                {deal.company && <p className="text-muted-foreground truncate">{deal.company}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-primary font-semibold">{formatCurrency(deal.value)}</span>
                <button
                  onClick={() => onDeleteDeal(deal)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  data-testid={`edit-modal-delete-deal-${deal.deal_id}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Pipeline Edit Modal (Feature 2) ———
function PipelineEditModal({ open, onClose, stages, deals, onStagesUpdated, onDealDeleted }) {
  const [localStages, setLocalStages] = useState(stages);

  useEffect(() => { setLocalStages(stages); }, [stages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localStages.findIndex((s) => s.stage_id === active.id);
    const newIdx = localStages.findIndex((s) => s.stage_id === over.id);
    const reordered = arrayMove(localStages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    setLocalStages(reordered);
    try {
      await axios.patch(
        `${API}/pipeline/stages/reorder`,
        { stages: reordered.map((s) => ({ stage_id: s.stage_id, order: s.order })) },
        { headers: getAuthHeader() }
      );
      onStagesUpdated(reordered);
      toast.success("Etapas reordenadas.");
    } catch {
      setLocalStages(stages);
      toast.error("Erro ao reordenar etapas.");
    }
  };

  const handleRename = async (stageId, newName) => {
    try {
      await axios.patch(`${API}/pipeline/stages/${stageId}`, { name: newName }, { headers: getAuthHeader() });
      const updated = localStages.map((s) => s.stage_id === stageId ? { ...s, name: newName } : s);
      setLocalStages(updated);
      onStagesUpdated(updated);
      toast.success("Etapa renomeada.");
    } catch {
      toast.error("Erro ao renomear etapa.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col" data-testid="pipeline-edit-modal">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Settings2 size={16} />
            Gerenciar Pipeline
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Arraste para reordenar etapas. Clique no nome para renomear.
        </p>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={localStages.map((s) => s.stage_id)} strategy={verticalListSortingStrategy}>
              {localStages.map((stage) => (
                <SortableStageRow
                  key={stage.stage_id}
                  stage={stage}
                  deals={deals.filter((d) => d.stage_id === stage.stage_id)}
                  onRename={handleRename}
                  onDeleteDeal={onDealDeleted}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ——— Main Pipeline Board ———
export default function Pipeline() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_DEAL);

  const deletedTimers = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const fetchData = async () => {
    try {
      const [stR, dR] = await Promise.all([
        axios.get(`${API}/pipeline/stages`, { headers: getAuthHeader() }),
        axios.get(`${API}/pipeline/deals`, { headers: getAuthHeader() }),
      ]);
      setStages(stR.data);
      setDeals(dR.data);
    } catch (err) {
      console.error("Error fetching pipeline:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ——— Soft-delete deal with undo toast (Feature 2) ———
  const handleSoftDeleteDeal = useCallback((deal) => {
    // Optimistic remove
    setDeals((prev) => prev.filter((d) => d.deal_id !== deal.deal_id));

    const timer = setTimeout(async () => {
      try {
        await axios.delete(`${API}/pipeline/deals/${deal.deal_id}`, { headers: getAuthHeader() });
      } catch {
        setDeals((prev) => [...prev, deal]);
      }
      delete deletedTimers.current[deal.deal_id];
    }, 5000);

    deletedTimers.current[deal.deal_id] = timer;

    toast("Deal removido", {
      description: deal.title,
      action: {
        label: "Desfazer",
        onClick: () => {
          clearTimeout(deletedTimers.current[deal.deal_id]);
          delete deletedTimers.current[deal.deal_id];
          setDeals((prev) => [deal, ...prev]);
        },
      },
      duration: 5000,
    });
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetStage = stages.find((s) => s.stage_id === over.id);
    if (!targetStage) return;
    setDeals((prev) =>
      prev.map((d) => d.deal_id === active.id ? { ...d, stage_id: targetStage.stage_id } : d)
    );
    try {
      await axios.put(`${API}/pipeline/deals/${active.id}`, { stage_id: targetStage.stage_id }, { headers: getAuthHeader() });
    } catch (err) {
      console.error("Error moving deal:", err);
      fetchData();
    }
  };

  const openAddDeal = (stageId) => {
    setForm({ ...EMPTY_DEAL, stage_id: stageId });
    setCreateModalOpen(true);
  };

  const handleSaveDeal = async () => {
    if (!form.title.trim() || !form.stage_id) return;
    try {
      const res = await axios.post(`${API}/pipeline/deals`, form, { headers: getAuthHeader() });
      setDeals((prev) => [res.data, ...prev]);
      setCreateModalOpen(false);
      toast.success("Deal criado!");
    } catch (err) {
      console.error("Error creating deal:", err);
      toast.error("Erro ao criar deal.");
    }
  };

  const activeDeal = activeId ? deals.find((d) => d.deal_id === activeId) : null;
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} &bull; Total: {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            data-testid="pipeline-edit-button"
          >
            <Settings2 size={15} className="mr-1.5" />
            Gerenciar
          </Button>
          <Button
            onClick={() => {
              setForm({ ...EMPTY_DEAL, stage_id: stages[0]?.stage_id || "" });
              setCreateModalOpen(true);
            }}
            data-testid="create-deal-button"
          >
            <Plus size={16} className="mr-2" />
            Novo Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hidden flex-1" data-testid="kanban-board">
          {stages.map((stage) => (
            <DroppableColumn
              key={stage.stage_id}
              stage={stage}
              deals={deals.filter((d) => d.stage_id === stage.stage_id)}
              onAddDeal={openAddDeal}
              onDeleteDeal={handleSoftDeleteDeal}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isOverlay onDelete={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* Create Deal Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="deal-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Título *</Label>
              <Input placeholder="Ex: Gestão de tráfego — Empresa X" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="deal-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Valor (R$)</Label>
                <Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} data-testid="deal-value-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Probabilidade (%)</Label>
                <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })} data-testid="deal-probability-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contato</Label>
              <Input placeholder="Nome do contato" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} data-testid="deal-contact-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input placeholder="Nome da empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="deal-company-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Etapa</Label>
              <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                <SelectTrigger data-testid="deal-stage-select"><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.stage_id} value={s.stage_id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea placeholder="Observações..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} data-testid="deal-notes-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} data-testid="deal-modal-cancel">Cancelar</Button>
            <Button onClick={handleSaveDeal} disabled={!form.title.trim() || !form.stage_id} data-testid="deal-modal-save">Criar deal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pipeline Edit Modal (Feature 2) */}
      <PipelineEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        stages={stages}
        deals={deals}
        onStagesUpdated={setStages}
        onDealDeleted={handleSoftDeleteDeal}
      />
    </div>
  );
}
