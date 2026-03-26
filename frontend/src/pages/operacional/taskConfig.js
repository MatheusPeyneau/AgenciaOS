export function formatMinutes(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function isOverdue(dateStr, status) {
  if (!dateStr || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dateStr) < new Date();
}

export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export const STATUS_CFG = {
  TO_DO:       { label: "A Fazer",      badge: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
  IN_PROGRESS: { label: "Em Andamento", badge: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  IN_REVIEW:   { label: "Em Revisão",   badge: "text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  DONE:        { label: "Concluída",    badge: "text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
  CANCELLED:   { label: "Cancelada",    badge: "text-muted-foreground bg-muted border border-border" },
};

export const PRIORITY_CFG = {
  URGENT: { label: "Urgente", badge: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
  HIGH:   { label: "Alta",    badge: "text-orange-600 bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800" },
  NORMAL: { label: "Normal",  badge: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  LOW:    { label: "Baixa",   badge: "text-muted-foreground bg-muted border border-border" },
};

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}
