"use client";

import * as React from "react";
import {
  NotebookPen,
  Plus,
  Trash2,
  Undo2,
  Pencil,
  Check,
  X,
  LockOpen,
} from "lucide-react";
import { useProgressStore } from "@/stores/progressStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TodayNoteCard() {
  const logs = useProgressStore((s) => s.logs);
  const addLog = useProgressStore((s) => s.addLog);
  const updateLog = useProgressStore((s) => s.updateLog);
  const removeLog = useProgressStore((s) => s.removeLog);
  const unlockLog = useProgressStore((s) => s.unlockLog);
  const undoLogs = useProgressStore((s) => s.undoLogs);
  const canUndoLogs = useProgressStore((s) => s.canUndoLogs);
  const [text, setText] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  const todayKey = React.useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const todayLogs = logs.filter((l) => l.date === todayKey);
  const recent = logs.slice(0, 10);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    addLog(t);
    setText("");
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditText(current);
  };

  const saveEdit = (id: string) => {
    const t = editText.trim();
    if (!t) return;
    updateLog(id, t);
    setEditingId(null);
    setEditText("");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <NotebookPen className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">What did you do today?</CardTitle>
          <p className="text-xs text-muted-foreground">
            Your notes + calendar sessions feed AI analysis. Learning time comes from the Calendar.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => undoLogs()}
          disabled={!canUndoLogs()}
          title="Undo last change"
        >
          <Undo2 className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
          }}
          rows={3}
          placeholder="e.g. Finished pandas groupby, solved 5 tasks, watched a lecture on cross-validation"
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex justify-end">
          <Button onClick={save} disabled={!text.trim()}>
            <Plus className="size-4" />
            Save note
          </Button>
        </div>

        {todayLogs.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Today: {todayLogs.length} note{todayLogs.length > 1 ? "s" : ""} saved
          </div>
        )}

        {recent.length > 0 && (
          <ul className="space-y-1.5">
            {recent.map((l) => (
              <li
                key={l.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                  l.locked && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {editingId === l.id && !l.locked ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full resize-y rounded border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(l.id)} disabled={!editText.trim()}>
                        <Check className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditText(""); }}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <span className="mr-2 text-[11px] text-muted-foreground">
                        {new Date(l.date + "T12:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" })}
                      </span>
                      {l.text}
                      {l.locked && (
                        <span className="ml-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">· saved</span>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {l.locked ? (
                        <button onClick={() => unlockLog(l.id)} className="text-amber-700 dark:text-amber-400" title="Unlock">
                          <LockOpen className="size-3.5" />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => startEdit(l.id, l.text)} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="size-3.5" />
                          </button>
                          <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
