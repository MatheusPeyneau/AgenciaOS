import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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
import { Plus, GripVertical, Trash2, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const EMPTY_DEAL = {
  title: "", value: 0, stage_id: "", contact_name: "",
  company: "", probability: 50, notes: "",
};

function DealCard({ deal, isOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.deal_id,
    data: { deal },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-background border border-border p-3.5 rounded-md cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "opacity-40",
        isOverlay && "shadow-xl opacity-100 rotate-1"
      )}
      data-testid={`deal-card-${deal.deal_id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold text-sm leading-tight">{deal.title}</p>
        <GripVertical size={14} className="text-muted-foreground shrink-0 mt-0.5" />
      </div>
      {deal.company && (
        <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>
      )}
      {deal.contact_name && (
        <p className="text-xs text-muted-foreground">{deal.contact_name}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <p className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-12 bg-muted rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full"
              style={{ width: `${deal.probability || 50}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{deal.probability || 50}%</span>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ stage, deals, onAddDeal, onDeleteDeal }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.stage_id });
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div
      className={cn(
        "w-[290px] shrink-0 flex flex-col gap-3 bg-muted/30 border border-border p-4 rounded-lg transition-all duration-150",
        isOver && "bg-muted/60 border-primary/40 ring-1 ring-primary/20"
      )}
      data-testid={`kanban-column-${stage.stage_id}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-heading font-semibold text-sm">{stage.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(totalValue)}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2.5 min-h-[80px]"
      >
        {deals.map((deal) => (
          <div key={deal.deal_id} className="relative group">
            <DealCard deal={deal} />
            <button
              className="absolute top-2 right-7 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteDeal(deal)}
              data-testid={`delete-deal-${deal.deal_id}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add deal button */}
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

export default function Pipeline() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_DEAL);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const fetchData = async () => {
    try {
      const [stagesRes, dealsRes] = await Promise.all([
        axios.get(`${API}/pipeline/stages`, { headers: getAuthHeader() }),
        axios.get(`${API}/pipeline/deals`, { headers: getAuthHeader() }),
      ]);
      setStages(stagesRes.data);
      setDeals(dealsRes.data);
    } catch (err) {
      console.error("Error fetching pipeline:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    // Find target stage
    const targetStage = stages.find((s) => s.stage_id === over.id);
    if (!targetStage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.deal_id === active.id ? { ...d, stage_id: targetStage.stage_id } : d
      )
    );

    try {
      await axios.put(
        `${API}/pipeline/deals/${active.id}`,
        { stage_id: targetStage.stage_id },
        { headers: getAuthHeader() }
      );
    } catch (err) {
      console.error("Error moving deal:", err);
      fetchData();
    }
  };

  const openAddDeal = (stageId) => {
    setForm({ ...EMPTY_DEAL, stage_id: stageId });
    setModalOpen(true);
  };

  const handleSaveDeal = async () => {
    if (!form.title.trim() || !form.stage_id) return;
    try {
      const res = await axios.post(`${API}/pipeline/deals`, form, { headers: getAuthHeader() });
      setDeals((prev) => [res.data, ...prev]);
      setModalOpen(false);
    } catch (err) {
      console.error("Error creating deal:", err);
    }
  };

  const handleDeleteDeal = async (deal) => {
    if (!window.confirm(`Remover o deal "${deal.title}"?`)) return;
    try {
      await axios.delete(`${API}/pipeline/deals/${deal.deal_id}`, { headers: getAuthHeader() });
      setDeals((prev) => prev.filter((d) => d.deal_id !== deal.deal_id));
    } catch (err) {
      console.error("Error deleting deal:", err);
    }
  };

  const activeDeal = activeId ? deals.find((d) => d.deal_id === activeId) : null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} &bull; Total:{" "}
            {formatCurrency(totalPipelineValue)}
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...EMPTY_DEAL, stage_id: stages[0]?.stage_id || "" });
            setModalOpen(true);
          }}
          data-testid="create-deal-button"
        >
          <Plus size={16} className="mr-2" />
          Novo Deal
        </Button>
      </div>

      {/* Board */}
      {stages.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Kanban size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhuma etapa configurada</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-5 overflow-x-auto pb-6 scrollbar-hidden flex-1"
            data-testid="kanban-board"
          >
            {stages.map((stage) => (
              <DroppableColumn
                key={stage.stage_id}
                stage={stage}
                deals={deals.filter((d) => d.stage_id === stage.stage_id)}
                onAddDeal={openAddDeal}
                onDeleteDeal={handleDeleteDeal}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} isOverlay />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Deal Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="deal-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo Deal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Título *</Label>
              <Input
                placeholder="Ex: Proposta de gestão de tráfego"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="deal-title-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                  data-testid="deal-value-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Probabilidade (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })}
                  data-testid="deal-probability-input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contato</Label>
              <Input
                placeholder="Nome do contato"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                data-testid="deal-contact-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input
                placeholder="Nome da empresa"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                data-testid="deal-company-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Etapa</Label>
              <Select
                value={form.stage_id}
                onValueChange={(v) => setForm({ ...form, stage_id: v })}
              >
                <SelectTrigger data-testid="deal-stage-select">
                  <SelectValue placeholder="Selecionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.stage_id} value={s.stage_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                placeholder="Observações sobre o deal..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                data-testid="deal-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} data-testid="deal-modal-cancel">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDeal}
              disabled={!form.title.trim() || !form.stage_id}
              data-testid="deal-modal-save"
            >
              Criar deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
