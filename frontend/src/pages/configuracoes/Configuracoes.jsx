import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Settings, Sun, Moon, Zap, Bot, Globe } from "lucide-react";

export default function Configuracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferências e configurações da sua conta
        </p>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Settings size={16} />
          Perfil
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Nome</p>
            <p className="text-sm font-medium mt-0.5">{user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Email</p>
            <p className="text-sm font-medium mt-0.5">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Função</p>
            <p className="text-sm font-medium mt-0.5 capitalize">{user?.role || "admin"}</p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Sun size={16} />
          Aparência
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
              theme === "light"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-muted"
            }`}
            data-testid="theme-light-button"
          >
            <Sun size={15} />
            Claro
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-muted"
            }`}
            data-testid="theme-dark-button"
          >
            <Moon size={15} />
            Escuro
          </button>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Bot size={16} />
          Integrações (pré-configuradas)
        </h2>
        <div className="space-y-3">
          {[
            { icon: Bot, label: "Anthropic Claude", desc: "IA para qualificação de leads e conteúdo", status: "Configurado" },
            { icon: Zap, label: "Google Gemini", desc: "IA complementar via Emergent", status: "Configurado" },
            { icon: Globe, label: "n8n Automações", desc: "Automações via webhooks", status: "Em breve" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-background rounded-md border border-border">
                  <item.icon size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.status === "Configurado"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
