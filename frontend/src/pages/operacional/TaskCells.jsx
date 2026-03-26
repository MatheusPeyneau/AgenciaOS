import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { STATUS_CFG, PRIORITY_CFG, formatMinutes, formatDate, isOverdue, getInitials } from "./taskConfig";

// ——— Inline Dropdown ———
export function InlineSelect({ value, options, onChange, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        {options.find((o) => o.value === value)?.label || value}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[140px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn("block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors", value === opt.value && "bg-muted font-medium")}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Status Badge ———
export function StatusBadge({ status, onUpdate }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.TO_DO;
  const options = Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }));
  return <InlineSelect value={status} options={options} onChange={onUpdate} className={cn("text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer", cfg.badge)} />;
}

// ——— Priority Badge ———
export function PriorityBadge({ priority, onUpdate }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.NORMAL;
  const options = Object.entries(PRIORITY_CFG).map(([k, v]) => ({ value: k, label: v.label }));
  return <InlineSelect value={priority} options={options} onChange={onUpdate} className={cn("text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer", cfg.badge)} />;
}

// ——— Assignee Cell ———
export function AssigneeCell({ assignee, collaborators, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={() => setOpen((o) => !o)} title={assignee?.name || "Sem responsável"}
        className="w-7 h-7 rounded-full bg-muted text-xs font-semibold flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
        data-testid="assignee-cell">
        {assignee ? getInitials(assignee.name) : "+"}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <button onClick={() => { onUpdate(null); setOpen(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-muted-foreground">
            Sem responsável
          </button>
          {collaborators.map((c) => (
            <button key={c.collaborator_id} onClick={() => { onUpdate(c.collaborator_id); setOpen(false); }}
              className={cn("flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors", assignee?.collaborator_id === c.collaborator_id && "bg-muted font-medium")}>
              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold shrink-0">{getInitials(c.name)}</div>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Date Cell ———
export function DateCell({ value, overdue, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ? value.substring(0, 10) : "");
  const handleBlur = () => {
    setEditing(false);
    const newVal = val || null;
    if (newVal !== (value ? value.substring(0, 10) : null)) onUpdate(newVal);
  };
  if (editing) {
    return <input type="date" value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur} autoFocus
      className="w-full text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none" />;
  }
  const formatted = formatDate(value);
  return (
    <button onClick={() => setEditing(true)} className={cn("text-xs hover:underline transition-colors w-full text-center", overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
      {formatted || "—"}
    </button>
  );
}

// ——— Estimated Cell ———
export function EstimatedCell({ value, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const handleBlur = () => {
    setEditing(false);
    const mins = parseInt(val) || null;
    if (mins !== value) onUpdate(mins);
  };
  if (editing) {
    return <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur} onKeyDown={(e) => e.key === "Enter" && handleBlur()} autoFocus placeholder="min"
      className="w-16 text-xs bg-background border border-primary rounded px-1 py-0.5 outline-none text-center" />;
  }
  return <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:underline w-full text-center">{formatMinutes(value)}</button>;
}

// ——— Title Cell ———
export function TitleCell({ task, expanded, hasSubtasks, onToggle, onUpdate, depth }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);
  const inputRef = useRef(null);
  const handleBlur = () => {
    setEditing(false);
    if (val.trim() && val.trim() !== task.title) onUpdate(val.trim());
    else setVal(task.title);
  };
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);

  return (
    <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: (depth || 0) * 20 }}>
      {hasSubtasks ? (
        <button onClick={onToggle} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors" data-testid={`expand-${task.task_id}`}>
          {expanded
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="m6 9 6 6 6-6"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="m9 18 6-6-6-6"/></svg>}
        </button>
      ) : <span className="w-4 shrink-0" />}
      {editing ? (
        <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setEditing(false); setVal(task.title); } }}
          className="flex-1 min-w-0 text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
          data-testid={`title-input-${task.task_id}`} />
      ) : (
        <button onClick={() => setEditing(true)}
          className={cn("text-sm text-left truncate flex-1 hover:text-primary transition-colors", task.status === "DONE" && "line-through text-muted-foreground")}
          data-testid={`title-cell-${task.task_id}`}>
          {task.title}
          {hasSubtasks && <span className="ml-1.5 text-xs text-muted-foreground">({task.completed_subtasks}/{task.subtask_count})</span>}
        </button>
      )}
    </div>
  );
}

// ——— Time Cell ———
export function TimeCell({ task, onLog }) {
  return (
    <div className="flex items-center gap-1 justify-center">
      <span className="text-xs text-muted-foreground">{formatMinutes(task.tracked_minutes)}</span>
      <button onClick={() => onLog(task)} title="Registrar tempo"
        className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
        data-testid={`time-log-${task.task_id}`}>
        <Plus size={10} />
      </button>
    </div>
  );
}
