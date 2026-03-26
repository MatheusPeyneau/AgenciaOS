import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileEdit, Sparkles, Loader2, AlertTriangle, ExternalLink,
  ChevronRight, RotateCcw, Copy, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

const PROGRESS_MESSAGES = [
  "Conectando ao N8N...",
  "Buscando informações do nicho...",
  "Analisando tendências do mercado...",
  "Estruturando os slides do carrossel...",
  "Finalizando o conteúdo...",
];

function SlideCard({ slide, index }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden aspect-square flex flex-col" data-testid={`slide-card-${index}`}>
      <div className="bg-primary/10 p-4 flex items-center justify-center flex-1">
        <div className="text-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Slide {index + 1}</span>
          {slide.title && (
            <h3 className="font-heading font-bold text-sm mt-1 leading-snug line-clamp-3">
              {slide.title}
            </h3>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-border">
        {slide.body && <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{slide.body}</p>}
        {slide.cta && (
          <p className="text-xs font-semibold text-primary mt-2">{slide.cta}</p>
        )}
        {slide.hashtags && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 truncate">{slide.hashtags}</p>
        )}
      </div>
    </div>
  );
}

export default function Conteudo() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const progressInterval = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/clients`, { headers: getAuthHeader() });
        setClients(res.data.filter((c) => c.status === "ativo"));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const client = clients.find((c) => c.client_id === selectedClientId);
    setSelectedClient(client || null);
    setResult(null);
    setError(null);
  }, [selectedClientId, clients]);

  const startProgress = () => {
    setProgress(0);
    let step = 0;
    setProgressMsg(PROGRESS_MESSAGES[0]);
    progressInterval.current = setInterval(() => {
      step++;
      setProgress(Math.min((step / 6) * 100, 95));
      setProgressMsg(PROGRESS_MESSAGES[Math.min(step, PROGRESS_MESSAGES.length - 1)]);
    }, 5000);
  };

  const stopProgress = (success = true) => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(100);
    if (success) setProgressMsg("Carrossel gerado com sucesso!");
    else setProgressMsg("");
  };

  const handleGenerate = async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    setResult(null);
    setError(null);
    startProgress();

    try {
      const res = await axios.post(
        `${API}/content/carousel/generate`,
        { client_id: selectedClientId },
        { headers: getAuthHeader() }
      );
      stopProgress(true);
      setResult(res.data.data);
      toast.success("Carrossel gerado!", { description: `Job ID: ${res.data.job_id}` });
    } catch (err) {
      stopProgress(false);
      const detail = err.response?.data?.detail || "Erro desconhecido ao gerar carrossel";
      setError({ message: detail, status: err.response?.status });
    }
    setGenerating(false);
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slides = result?.slides || (Array.isArray(result) ? result : null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Conteúdo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geração de carrosséis via N8N com dados do cliente
        </p>
      </div>

      {/* Generate Carousel Section */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold">Gerar Carrossel com IA</h2>
            <p className="text-xs text-muted-foreground">Dispara webhook no N8N com dados do cliente para geração automática</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger data-testid="carousel-client-select" className="max-w-sm">
                <SelectValue placeholder="Selecionar cliente ativo..." />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum cliente ativo</div>
                ) : (
                  clients.map((c) => (
                    <SelectItem key={c.client_id} value={c.client_id}>
                      {c.name}{c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Notes preview */}
          {selectedClient && (
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                selectedClient.notes?.trim()
                  ? "bg-muted/30 border-border"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
              )}
              data-testid="client-notes-preview"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                Notas do Cliente
              </p>
              {selectedClient.notes?.trim() ? (
                <p className="text-sm leading-relaxed text-foreground/80 line-clamp-4">
                  {selectedClient.notes}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  <p className="text-xs">
                    Nenhuma nota cadastrada.{" "}
                    <button
                      className="underline hover:no-underline"
                      onClick={() => navigate("/clientes")}
                    >
                      Adicione informações do nicho
                    </button>{" "}
                    antes de gerar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedClientId || !selectedClient?.notes?.trim()}
            className="gap-2"
            data-testid="generate-carousel-button"
          >
            {generating ? (
              <><Loader2 size={15} className="animate-spin" />Gerando...</>
            ) : (
              <><Sparkles size={15} />Gerar Carrossel</>
            )}
          </Button>
        </div>

        {/* Progress bar */}
        {generating && (
          <div className="mt-5 space-y-2" data-testid="carousel-progress">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{progressMsg}</p>
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Aguardando resposta do N8N (timeout: 30s por tentativa, até 3 tentativas)
            </p>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 mb-6"
          data-testid="carousel-error"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">Falha na geração</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              {error.status === 400 && error.message.includes("configurado") && (
                <button
                  className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  onClick={() => navigate("/configuracoes")}
                  data-testid="error-goto-settings"
                >
                  <ExternalLink size={12} />
                  Ir para Configurações
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || !selectedClientId}
              data-testid="retry-generate-button"
            >
              <RotateCcw size={13} className="mr-1.5" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Result: slides grid */}
      {result && (
        <div data-testid="carousel-result">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-heading font-semibold">
                {slides ? `${slides.length} slides gerados` : "Resposta do N8N"}
              </h2>
              {result.topic && (
                <p className="text-xs text-muted-foreground mt-0.5">Tópico: {result.topic}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyResult} data-testid="copy-result-button">
                {copied ? <><CheckCheck size={13} className="mr-1.5 text-emerald-500" />Copiado!</> : <><Copy size={13} className="mr-1.5" />Copiar JSON</>}
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} data-testid="regenerate-button">
                <RotateCcw size={13} className="mr-1.5" />
                Regerar
              </Button>
            </div>
          </div>

          {slides ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {slides.map((slide, i) => (
                <SlideCard key={i} slide={slide} index={i} />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3">
                Resposta recebida do N8N
              </p>
              <pre className="text-xs font-mono text-foreground/80 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Coming soon modules */}
      {!result && !generating && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          {[
            { icon: FileEdit, label: "Calendário Editorial", desc: "Planejamento de publicações" },
            { icon: Sparkles, label: "Legendas com IA", desc: "Geração de texto para posts" },
            { icon: ChevronRight, label: "Publicação Automática", desc: "Agendamento no Instagram" },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-4 opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-muted rounded-md">
                  <item.icon size={14} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{item.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              <span className="text-xs text-muted-foreground/60 mt-1 inline-block">Em breve</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
