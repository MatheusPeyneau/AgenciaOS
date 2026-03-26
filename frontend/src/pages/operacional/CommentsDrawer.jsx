import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X } from "lucide-react";
import { API, getAuthHeader } from "./taskConfig";

export function CommentsDrawer({ task, open, onClose }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    setLoading(true);
    axios.get(`${API}/tasks/${task.task_id}/comments`, { headers: getAuthHeader() })
      .then((r) => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, task]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/tasks/${task.task_id}/comments`, { content }, { headers: getAuthHeader() });
      setComments((prev) => [...prev, res.data]);
      setContent("");
    } catch { toast.error("Erro ao enviar comentário"); }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-80 bg-background border-l border-border flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold font-heading">Comentários</p>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{task?.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum comentário ainda</p>
          ) : comments.map((c) => (
            <div key={c.comment_id} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{c.author_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border space-y-2">
          <Textarea placeholder="Escreva um comentário..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="text-sm resize-none" data-testid="comment-input" />
          <Button size="sm" className="w-full gap-2" onClick={handleSubmit} disabled={submitting || !content.trim()} data-testid="submit-comment-btn">
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
