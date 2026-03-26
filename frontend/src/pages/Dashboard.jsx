import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, TrendingUp, Building2, DollarSign, ArrowUpRight, Target } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

const STATUS_LABELS = {
  novo: "Novo",
  qualificado: "Qualificado",
  em_atendimento: "Em Atendimento",
  desqualificado: "Desqualificado",
};

const STATUS_COLORS = {
  novo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qualificado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  em_atendimento: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  desqualificado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function KPICard({ title, value, icon: Icon, trend, description, testId }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-5 hover:-translate-y-0.5 transition-transform duration-150"
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-primary/10 rounded-md">
          <Icon size={18} className="text-primary" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-heading font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/dashboard/kpis`, { headers: getAuthHeader() });
        setKpis(res.data);
      } catch (err) {
        console.error("Error fetching KPIs:", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = kpis?.deals_by_stage || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral da sua agência em tempo real
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KPICard
          title="Total de Leads"
          value={kpis?.total_leads || 0}
          icon={Users}
          description={`${kpis?.leads_this_month || 0} novos este mês`}
          testId="kpi-total-leads"
        />
        <KPICard
          title="Pipeline"
          value={formatCurrency(kpis?.pipeline_value)}
          icon={TrendingUp}
          description={`${kpis?.total_deals || 0} deals ativos`}
          testId="kpi-pipeline-value"
        />
        <KPICard
          title="Clientes Ativos"
          value={kpis?.active_clients || 0}
          icon={Building2}
          testId="kpi-active-clients"
        />
        <KPICard
          title="MRR"
          value={formatCurrency(kpis?.mrr)}
          icon={DollarSign}
          description="Receita mensal recorrente"
          testId="kpi-mrr"
        />
      </div>

      {/* Charts + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline Chart */}
        <div
          className="lg:col-span-2 bg-card border border-border rounded-lg p-5"
          data-testid="pipeline-chart"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-heading font-semibold">Pipeline por Etapa</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              Taxa de conversão: {kpis?.conversion_rate || 0}%
            </span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground">
              <div className="text-center">
                <Target size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum deal no pipeline ainda</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div
          className="bg-card border border-border rounded-lg p-5"
          data-testid="recent-leads-panel"
        >
          <h2 className="text-base font-heading font-semibold mb-4">Leads Recentes</h2>
          {(kpis?.recent_leads || []).length > 0 ? (
            <ul className="space-y-3">
              {kpis.recent_leads.map((lead) => (
                <li
                  key={lead.lead_id}
                  className="flex items-center justify-between gap-3"
                  data-testid={`recent-lead-${lead.lead_id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.company || lead.email || "Sem empresa"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      STATUS_COLORS[lead.status] || STATUS_COLORS.novo
                    }`}
                  >
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <div className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum lead cadastrado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Rate Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
        <div className="bg-card border border-border rounded-lg p-5" data-testid="conversion-rate-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-md">
              <Target size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Taxa de Conversão</p>
              <p className="text-xs text-muted-foreground">Deals ganhos / total</p>
            </div>
          </div>
          <p className="text-3xl font-heading font-bold">{kpis?.conversion_rate || 0}%</p>
          <div className="mt-3 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(kpis?.conversion_rate || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5" data-testid="deals-won-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
              <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Deals Ganhos</p>
              <p className="text-xs text-muted-foreground">Total fechado</p>
            </div>
          </div>
          <p className="text-3xl font-heading font-bold">{kpis?.won_deals || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5" data-testid="leads-month-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Leads Este Mês</p>
              <p className="text-xs text-muted-foreground">Novos leads captados</p>
            </div>
          </div>
          <p className="text-3xl font-heading font-bold">{kpis?.leads_this_month || 0}</p>
        </div>
      </div>
    </div>
  );
}
