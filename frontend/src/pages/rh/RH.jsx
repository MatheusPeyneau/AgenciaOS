import React from "react";
import { UserCog, Shield, Users, CheckSquare, Clock } from "lucide-react";

const COMING_SOON_FEATURES = [
  { icon: Users, label: "Gestão de Colaboradores", desc: "Onboarding e perfis de equipe" },
  { icon: Shield, label: "Controle de Acesso (RBAC)", desc: "Permissões por papel e módulo" },
  { icon: CheckSquare, label: "Tarefas Internas", desc: "Gestão de tarefas da equipe" },
  { icon: UserCog, label: "Onboarding Automático", desc: "Processo guiado de integração" },
];

export default function RH() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold tracking-tight">RH</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão de colaboradores e controle de acesso
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-10 text-center mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-primary" />
        </div>
        <h2 className="text-xl font-heading font-semibold mb-2">Em desenvolvimento</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          O módulo de RH com gestão de colaboradores, permissões e controle de acesso estará
          disponível em breve.
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
