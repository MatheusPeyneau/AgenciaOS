import React from "react";
import { BarChart2, Target, Bell, TrendingUp, Clock } from "lucide-react";

const COMING_SOON_FEATURES = [
  { icon: TrendingUp, label: "Meta Ads", desc: "Monitore campanhas do Meta Ads" },
  { icon: Target, label: "Google Ads", desc: "Acompanhe Google Ads em tempo real" },
  { icon: BarChart2, label: "Relatórios Automáticos", desc: "Relatórios de performance mensais" },
  { icon: Bell, label: "Alertas de Performance", desc: "Notificações de métricas críticas" },
];

export default function Operacional() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Operacional</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoramento de campanhas e relatórios de performance
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-10 text-center mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-primary" />
        </div>
        <h2 className="text-xl font-heading font-semibold mb-2">Em desenvolvimento</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          O módulo operacional com integração a Meta Ads e Google Ads estará disponível em breve
          com monitoramento em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COMING_SOON_FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="bg-card border border-border rounded-lg p-5 opacity-60"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-muted rounded-md">
                <feature.icon size={16} className="text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">{feature.label}</p>
            </div>
            <p className="text-xs text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
