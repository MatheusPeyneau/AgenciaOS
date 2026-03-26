import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Sun, Moon, Globe, Bot, Zap, FlaskConical, CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}

function WebhookSection({ title, icon: Icon, description, settingKey, testLabel, payloadPreview }) {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const getEndpoint = () => (settingKey === "client" ? "webhook" : "carousel-webhook");
  const testEndpoint = settingKey === "client" ? "settings/webhook/test" : null;

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/${getEndpoint()}`, { headers: getAuthHeader() });
        setUrl(res.data.webhook_url || "");
        setEnabled(res.data.enabled ?? false);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await axios.put(
        `${API}/settings/${getEndpoint()}`,
        { webhook_url: url, enabled },
        { headers: getAuthHeader() }
      );
      setStatus("saved");
      toast.success("Webhook salvo com sucesso!");
    } catch (err) {
      setStatus("error");
      toast.error(err.response?.data?.detail || "Erro ao salvar webhook");
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTest = async () => {
    if (!testEndpoint) {
      toast.info("Teste disponível apenas para o webhook de clientes. Crie um cliente para testar o webhook de carrossel.");
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      const res = await axios.post(`${API}/${testEndpoint}`, {}, { headers: getAuthHeader() });
      setStatus("test_ok");
      toast.success(res.data.message || "Teste enviado com sucesso!");
    } catch (err) {
      setStatus("test_fail");
      toast.error(err.response?.data?.detail || "Falha no teste");
    }
    setTesting(false);
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid={`webhook-section-${settingKey}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Icon size={16} />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid={`webhook-toggle-${settingKey}`}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">URL do Webhook (N8N)</Label>
          <Input
            placeholder="https://seu-n8n.exemplo.com/webhook/xxxxxxxx"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            data-testid={`webhook-url-${settingKey}`}
          />
        </div>

        {payloadPreview && (
          <div className="bg-muted/40 border border-border rounded-md p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-2">
              Payload enviado ao N8N (POST JSON)
            </p>
            <pre className="text-xs text-foreground/80 font-mono leading-relaxed whitespace-pre-wrap">
              {payloadPreview}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !url.trim()} data-testid={`webhook-save-${settingKey}`}>
            {saving ? <><Loader2 size={14} className="mr-2 animate-spin" />Salvando...</> : "Salvar webhook"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !url.trim()}
            data-testid={`webhook-test-${settingKey}`}
          >
            {testing ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Testando...</>
            ) : (
              <><FlaskConical size={14} className="mr-2" />Testar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências e integrações da sua conta</p>
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
          {[
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Escuro", icon: Moon },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                theme === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
              }`}
              data-testid={`theme-${t.value}-button`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* N8N Client Webhook */}
      <WebhookSection
        title="N8N — Webhook de Clientes"
        icon={Globe}
        description="Ao cadastrar um novo cliente, envia automaticamente um POST JSON para o N8N com os dados de cobrança."
        settingKey="client"
        payloadPreview={`{
  "name": "Nome do Cliente",
  "cpfCnpj": "00000000000000",
  "email": "cliente@exemplo.com",
  "mobilePhone": "11999999999",
  "billingType": "BOLETO",
  "value": 500.00,
  "dueDate": "2025-12-01"
}`}
      />

      {/* N8N Carousel Webhook */}
      <WebhookSection
        title="N8N — Webhook de Carrossel"
        icon={Sparkles}
        description="Usado na aba Conteúdo para gerar carrosséis. Envia dados do cliente (nicho + notas) ao N8N e recebe os slides gerados."
        settingKey="carousel"
        payloadPreview={`{
  "jobId": "job_abc123",
  "clientId": "uuid",
  "clientName": "Nome do Cliente",
  "niche": "Empresa / Segmento",
  "notes": "Notas do nicho...",
  "email": "cliente@exemplo.com",
  "requestedAt": "2025-01-01T00:00:00Z"
}`}
      />

      {/* AI Integrations */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Bot size={16} />
          Integrações de IA (pré-configuradas)
        </h2>
        <div className="space-y-3">
          {[
            { icon: Bot, label: "Anthropic Claude", desc: "Qualificação de leads e geração de conteúdo", status: "Configurado" },
            { icon: Zap, label: "Google Gemini", desc: "IA complementar via Emergent LLM Key", status: "Configurado" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
