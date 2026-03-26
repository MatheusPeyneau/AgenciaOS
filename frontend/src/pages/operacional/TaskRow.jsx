import React from "react";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, MessageSquare, Plus } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isOverdue } from "./taskConfig";
import { StatusBadge, PriorityBadge, AssigneeCell, DateCell, EstimatedCell, TitleCell, TimeCell } from "./TaskCells";

export function TaskRow({ task, subtasks, collaborators, expandedIds, onToggleExpand, onUpdate, onDelete, onAddSubtask, onOpenComments, onLogTime, depth }) {
  const expanded = expandedIds.has(task.task_id);
  const hasSubtasks = (task.subtask_count || 0) > 0 || subtasks.length > 0;
  const dueDateOver = isOverdue(task.due_date, task.status);

  return (
    <React.Fragment>
      <div className={cn("group/row flex items-center gap-0 border-b border-border hover:bg-muted/20 transition-colors")} data-testid={`task-row-${task.task_id}`}>
        <div className="w-8 flex items-center justify-center shrink-0 opacity-0 group-hover/row:opacity-100 py-2.5">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
        <div className="w-32 shrink-0 px-1.5 py-2.5">
          <StatusBadge status={task.status} onUpdate={(v) => onUpdate(task.task_id, { status: v })} />
        </div>
        <div className="flex-1 min-w-0 px-1.5 py-2.5">
          <TitleCell task={task} expanded={expanded} hasSubtasks={hasSubtasks} onToggle={() => onToggleExpand(task.task_id)} onUpdate={(title) => onUpdate(task.task_id, { title })} depth={depth} />
        </div>
        <div className="w-16 shrink-0 px-1 py-2.5">
          <AssigneeCell assignee={task.assignee} collaborators={collaborators} onUpdate={(id) => onUpdate(task.task_id, { assignee_id: id })} />
        </div>
        <div className="w-24 shrink-0 px-1 py-2.5">
          <DateCell value={task.start_date} overdue={false} onUpdate={(v) => onUpdate(task.task_id, { start_date: v })} />
        </div>
        <div className="w-24 shrink-0 px-1 py-2.5">
          <DateCell value={task.due_date} overdue={dueDateOver} onUpdate={(v) => onUpdate(task.task_id, { due_date: v })} />
        </div>
        <div className="w-20 shrink-0 px-1 py-2.5">
          <EstimatedCell value={task.estimated_minutes} onUpdate={(v) => onUpdate(task.task_id, { estimated_minutes: v })} />
        </div>
        <div className="w-24 shrink-0 px-1 py-2.5">
          <PriorityBadge priority={task.priority} onUpdate={(v) => onUpdate(task.task_id, { priority: v })} />
        </div>
        <div className="w-20 shrink-0 px-1 py-2.5">
          <TimeCell task={task} onLog={onLogTime} />
        </div>
        <div className="w-12 shrink-0 px-1 py-2.5 flex justify-center">
          <button onClick={() => onOpenComments(task)} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid={`comments-cell-${task.task_id}`}>
            <MessageSquare size={12} />
            <span>{task.comment_count || 0}</span>
          </button>
        </div>
        <div className="w-8 shrink-0 flex justify-center py-2.5">
          <button onClick={() => onDelete(task.task_id)} className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" data-testid={`delete-task-${task.task_id}`}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded && subtasks.map((sub) => (
        <SubTaskRow key={sub.task_id} task={sub} collaborators={collaborators} onUpdate={onUpdate} onDelete={onDelete} onOpenComments={onOpenComments} onLogTime={onLogTime} />
      ))}
      {expanded && (
        <div className="flex items-center border-b border-border bg-muted/10" style={{ paddingLeft: 44 }}>
          <button onClick={() => onAddSubtask(task.task_id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 transition-colors">
            <Plus size={11} /> Adicionar subtarefa
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

function SubTaskRow({ task, collaborators, onUpdate, onDelete, onOpenComments, onLogTime }) {
  const dueDateOver = isOverdue(task.due_date, task.status);
  return (
    <div className="group/row flex items-center gap-0 border-b border-border hover:bg-muted/20 transition-colors" data-testid={`task-row-${task.task_id}`}>
      <div className="w-8 shrink-0" />
      <div className="w-32 shrink-0 px-1.5 py-2">
        <StatusBadge status={task.status} onUpdate={(v) => onUpdate(task.task_id, { status: v })} />
      </div>
      <div className="flex-1 min-w-0 px-1.5 py-2">
        <TitleCell task={task} expanded={false} hasSubtasks={false} onToggle={() => {}} onUpdate={(title) => onUpdate(task.task_id, { title })} depth={1} />
      </div>
      <div className="w-16 shrink-0 px-1 py-2">
        <AssigneeCell assignee={task.assignee} collaborators={collaborators} onUpdate={(id) => onUpdate(task.task_id, { assignee_id: id })} />
      </div>
      <div className="w-24 shrink-0 px-1 py-2">
        <DateCell value={task.start_date} overdue={false} onUpdate={(v) => onUpdate(task.task_id, { start_date: v })} />
      </div>
      <div className="w-24 shrink-0 px-1 py-2">
        <DateCell value={task.due_date} overdue={dueDateOver} onUpdate={(v) => onUpdate(task.task_id, { due_date: v })} />
      </div>
      <div className="w-20 shrink-0 px-1 py-2">
        <EstimatedCell value={task.estimated_minutes} onUpdate={(v) => onUpdate(task.task_id, { estimated_minutes: v })} />
      </div>
      <div className="w-24 shrink-0 px-1 py-2">
        <PriorityBadge priority={task.priority} onUpdate={(v) => onUpdate(task.task_id, { priority: v })} />
      </div>
      <div className="w-20 shrink-0 px-1 py-2">
        <TimeCell task={task} onLog={onLogTime} />
      </div>
      <div className="w-12 shrink-0 px-1 py-2 flex justify-center">
        <button onClick={() => onOpenComments(task)} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid={`comments-cell-${task.task_id}`}>
          <MessageSquare size={12} /><span>{task.comment_count || 0}</span>
        </button>
      </div>
      <div className="w-8 shrink-0 flex justify-center py-2">
        <button onClick={() => onDelete(task.task_id)} className="opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" data-testid={`delete-task-${task.task_id}`}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export function SortableTaskRow(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.task_id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <div {...listeners} {...attributes} style={{ position: "absolute", left: 0, top: 0, width: 32, height: "100%", cursor: "grab", zIndex: 1 }} />
      <TaskRow {...props} />
    </div>
  );
}
