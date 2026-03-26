import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart2, TrendingUp, Search, Bell, FileBarChart, CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

const SERVICES = [
  {
    key: "meta_ads",
    label: "Meta Ads",
    icon: TrendingUp,
    desc: "Facebook & Instagram Ads",
    activeColor: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "google_ads",
    label: "Google Ads",
    icon: Search,
    desc: "Search, Display & YouTube",
    activeColor: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "auto_reports",
    label: "Relatórios Auto",
    icon: FileBarChart,
    desc: "Relatórios mensais automáticos",
    activeColor: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "alerts",
    label: "Alertas",
    icon: Bell,
    desc: "Alertas de performance",
    activeColor: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

function getStatusBadge(card) {
  const active = SERVICES.filter((s) => card[s.key]).length;
  if (active === 0) return { label: "Sem serviços", className: "bg-muted text-muted-foreground" };
  if (active <= 2) return { label: "Básico", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { label: "Completo", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
}

function ServiceTile({ service, active, toggling, onToggle }) {
  return (
    <button
      onClick={() => onToggle(service.key, !active)}
      disabled={toggling}
      data-testid={`service-toggle-${service.key}`}
      className={cn(
        "flex flex-col items-start gap-2 p-3 rounded-lg border transition-all text-left w-full",
        active ? service.activeColor : "bg-muted/20 border-border hover:bg-muted/40",
        toggling && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center justify-between w-full">
        <service.icon size={16} className={active ? service.iconColor : "text-muted-foreground"} />
        {toggling ? (
          <Loader2 size={12} className="animate-spin text-muted-foreground" />
        ) : active ? (
          <CheckCircle2 size={12} className={service.iconColor} />
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <div>
        <p className={cn("text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
          {service.label}
        </p>
        <p className="text-xs text-muted-foreground leading-tight">{service.desc}</p>
      </div>
    </button>
  );
}

function OperationalClientCard({ card, onUpdate }) {
  const [toggling, setToggling] = useState({});
  const badge = getStatusBadge(card);
  const client = card.client || {};

  const handleToggle = async (serviceKey, value) => {
    setToggling((prev) => ({ ...prev, [serviceKey]: true }));
    try {
      const res = await axios.patch(
        `${API}/operational/${card.client_id}`,
        { [serviceKey]: value },
        { headers: getAuthHeader() }
      );
      onUpdate(card.client_id, { ...card, [serviceKey]: value });
    } catch {
      toast.error("Erro ao atualizar serviço.");
    }
    setToggling((prev) => ({ ...prev, [serviceKey]: false }));
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4"
      data-testid={`op-card-${card.client_id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-base truncate">{client.name || "Cliente"}</p>
          <p className="text-xs text-muted-foreground truncate">{client.company || client.email || "—"}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 gap-2">
        {SERVICES.map((svc) => (
          <ServiceTile
            key={svc.key}
            service={svc}
            active={!!card[svc.key]}
            toggling={!!toggling[svc.key]}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

export default function Operacional() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCards = async () => {
    try {
      const res = await axios.get(`${API}/operational`, { headers: getAuthHeader() });
      setCards(res.data);
    } catch (err) {
      console.error("Error fetching operational cards:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, []);

  const handleUpdate = useCallback((clientId, updatedCard) => {
    setCards((prev) => prev.map((c) => c.client_id === clientId ? updatedCard : c));
  }, []);

  const activeCount = cards.reduce((sum, c) => {
    return sum + SERVICES.filter((s) => c[s.key]).length;
  }, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Operacional</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cards.length} cliente{cards.length !== 1 ? "s" : ""} &bull; {activeCount} serviço{activeCount !== 1 ? "s" : ""} ativo{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/clientes")} data-testid="go-to-clients-button">
          <Plus size={15} className="mr-2" />
          Novo Cliente
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={44} className="text-muted-foreground opacity-30 mb-4" />
          <p className="text-base font-medium">Nenhum cliente operacional</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Os cards operacionais são criados automaticamente ao cadastrar um cliente.
          </p>
          <Button onClick={() => navigate("/clientes")} data-testid="empty-state-add-client">
            <Plus size={15} className="mr-2" />
            Cadastrar primeiro cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.map((card) => (
            <OperationalClientCard
              key={card.client_id}
              card={card}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
