import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Sun, Moon, Zap, Bot, Globe, FlaskConical, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null); // null | "saved" | "error" | "test_ok" | "test_fail"
  const [webhookMsg, setWebhookMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/webhook`, { headers: getAuthHeader() });
        setWebhookUrl(res.data.webhook_url || "");
        setWebhookEnabled(res.data.enabled ?? false);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSaveWebhook = async () => {
    setWebhookSaving(true);
    setWebhookStatus(null);
    try {
      await axios.put(
        `${API}/settings/webhook`,
        { webhook_url: webhookUrl, enabled: webhookEnabled },
        { headers: getAuthHeader() }
      );
      setWebhookStatus("saved");
      setWebhookMsg("Webhook salvo com sucesso!");
    } catch (err) {
      setWebhookStatus("error");
      setWebhookMsg(err.response?.data?.detail || "Erro ao salvar webhook");
    }
    setWebhookSaving(false);
    setTimeout(() => setWebhookStatus(null), 4000);
  };

  const handleTestWebhook = async () => {
    setWebhookTesting(true);
    setWebhookStatus(null);
    try {
      const res = await axios.post(`${API}/settings/webhook/test`, {}, { headers: getAuthHeader() });
      setWebhookStatus("test_ok");
      setWebhookMsg(res.data.message || "Payload de teste enviado!");
    } catch (err) {
      setWebhookStatus("test_fail");
      setWebhookMsg(err.response?.data?.detail || "Falha no teste do webhook");
    }
    setWebhookTesting(false);
    setTimeout(() => setWebhookStatus(null), 6000);
  };

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

      {/* N8N Webhook */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="n8n-webhook-section">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <Globe size={16} />
            N8N — Webhook de Clientes
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {webhookEnabled ? "Ativo" : "Inativo"}
            </span>
            <Switch
              checked={webhookEnabled}
              onCheckedChange={setWebhookEnabled}
              data-testid="webhook-enabled-toggle"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Quando ativo, ao cadastrar um novo cliente o sistema enviará automaticamente um POST
          JSON para o N8N com os dados de cobrança.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">URL do Webhook (N8N)</Label>
            <Input
              placeholder="https://seu-n8n.exemplo.com/webhook/xxxxxxxx"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              data-testid="webhook-url-input"
            />
          </div>

          {/* Payload preview */}
          <div className="bg-muted/40 border border-border rounded-md p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-2">
              Payload enviado ao N8N (POST JSON)
            </p>
            <pre className="text-xs text-foreground/80 font-mono leading-relaxed whitespace-pre-wrap">
{`{
  "name": "Nome do Cliente",
  "cpfCnpj": "00000000000000",
  "email": "cliente@exemplo.com",
  "mobilePhone": "11999999999",
  "billingType": "BOLETO",
  "value": 500.00,
  "dueDate": "2025-12-01"
}`}
            </pre>
          </div>

          {/* Status feedback */}
          {webhookStatus && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                webhookStatus === "saved" || webhookStatus === "test_ok"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
              data-testid="webhook-status-message"
            >
              {webhookStatus === "saved" || webhookStatus === "test_ok" ? (
                <CheckCircle2 size={15} />
              ) : (
                <XCircle size={15} />
              )}
              {webhookMsg}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSaveWebhook}
              disabled={webhookSaving || !webhookUrl.trim()}
              data-testid="webhook-save-button"
            >
              {webhookSaving ? (
                <><Loader2 size={14} className="mr-2 animate-spin" />Salvando...</>
              ) : (
                "Salvar webhook"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestWebhook}
              disabled={webhookTesting || !webhookUrl.trim()}
              data-testid="webhook-test-button"
            >
              {webhookTesting ? (
                <><Loader2 size={14} className="mr-2 animate-spin" />Testando...</>
              ) : (
                <><FlaskConical size={14} className="mr-2" />Testar</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Integrations */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Bot size={16} />
          Integrações de IA (pré-configuradas)
        </h2>
        <div className="space-y-3">
          {[
            { icon: Bot, label: "Anthropic Claude", desc: "IA para qualificação de leads e geração de conteúdo", status: "Configurado" },
            { icon: Zap, label: "Google Gemini", desc: "IA complementar via Emergent LLM Key", status: "Configurado" },
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
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
