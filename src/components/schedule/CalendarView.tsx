"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useScheduleStore } from "@/stores/scheduleStore";
import { CATEGORY_META, CATEGORY_OPTIONS } from "@/lib/categories";
import { habitRecurringEvents, habitOccurrencesForDate } from "@/lib/habits";
import { eventDuplicatesHabit, eventEchoesHabitOnDay } from "@/lib/habitDedupe";
import { toNaiveISO } from "@/lib/utils";
import type { EventCategory, EventStatus, ScheduleEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

const STATUS_LABEL: Record<EventStatus, string> = {
  planned: "Planned",
  done: "Done",
  skipped: "Skipped",
};

function EditModal({
  event,
  onClose,
}: {
  event: ScheduleEvent;
  onClose: () => void;
}) {
  const { updateEvent, removeEvent } = useScheduleStore();
  const timeOf = (iso: string) => iso.slice(11, 16);
  const withTime = (iso: string, hhmm: string) => `${iso.slice(0, 10)}T${hhmm}:00`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit event</h3>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Title</label>
          <input
            value={event.title}
            onChange={(e) => updateEvent(event.id, { title: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Start</label>
            <input
              type="time"
              value={timeOf(event.start)}
              onChange={(e) => updateEvent(event.id, { start: withTime(event.start, e.target.value) })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">End</label>
            <input
              type="time"
              value={timeOf(event.end)}
              onChange={(e) => updateEvent(event.id, { end: withTime(event.end, e.target.value) })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={event.category}
              onChange={(e) => updateEvent(event.id, { category: e.target.value as EventCategory })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              value={event.status}
              onChange={(e) => updateEvent(event.id, { status: e.target.value as EventStatus })}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(STATUS_LABEL) as EventStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {event.notes ? (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Notes (Rize titles)</label>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-relaxed">
              {event.notes}
            </pre>
          </div>
        ) : null}

        <div className="flex justify-between pt-1">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              removeEvent(event.id);
              onClose();
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

export function CalendarView() {
  const events = useScheduleStore((s) => s.events);
  const habits = useScheduleStore((s) => s.habits);
  const addEvent = useScheduleStore((s) => s.addEvent);
  const updateEvent = useScheduleStore((s) => s.updateEvent);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const fcEvents = React.useMemo(() => {
    const evts = events
      .filter((e) => !eventEchoesHabitOnDay(e, habits))
      .map((e) => {
      const meta = CATEGORY_META[e.category] ?? CATEGORY_META.other;
      return {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: meta.hex,
        borderColor: meta.hex,
        classNames: e.status === "done" ? ["opacity-60"] : [],
      };
    });
    const habitEvents = habitRecurringEvents(
      habits,
      (c) => (CATEGORY_META[c] ?? CATEGORY_META.habit).hex
    );
    return [...evts, ...habitEvents];
  }, [events, habits]);

  type EventArg = { event: { id: string; start: Date | null; end: Date | null } };
  type SelectArg = {
    start: Date;
    end: Date;
    view: { calendar: { unselect: () => void } };
  };
  type ClickArg = { event: { id: string } };
  type HeaderArg = { date: Date; view: { type: string } };

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dayHeaderContent = (arg: HeaderArg) => {
    const wk = arg.date.toLocaleDateString("en-US", { weekday: "short" });
    // Month view shows day numbers in cells, so only the weekday is useful here.
    if (arg.view.type === "dayGridMonth") return wk;
    return `${wk} ${pad2(arg.date.getDate())}.${pad2(arg.date.getMonth() + 1)}`;
  };

  const onDrop = (info: EventArg) => {
    const { event } = info;
    if (event.id.startsWith("habit_")) return; // recurring habits are read-only
    if (event.start) {
      updateEvent(event.id, {
        start: toNaiveISO(event.start),
        end: toNaiveISO(event.end ?? event.start),
      });
    }
  };

  const onResize = (info: EventArg) => {
    const { event } = info;
    if (event.id.startsWith("habit_")) return;
    if (event.start && event.end) {
      updateEvent(event.id, {
        start: toNaiveISO(event.start),
        end: toNaiveISO(event.end),
      });
    }
  };

  const onSelect = (info: SelectArg) => {
    const title = window.prompt("Event title:");
    if (title && title.trim()) {
      addEvent({
        title: title.trim(),
        category: "other",
        start: toNaiveISO(info.start),
        end: toNaiveISO(info.end),
        priority: 2,
      });
    }
    info.view.calendar.unselect();
  };

  const onEventClick = (info: ClickArg) => {
    if (info.event.id.startsWith("habit_")) return;
    setEditingId(info.event.id);
  };

  const editing = events.find((e) => e.id === editingId) ?? null;

  if (!mounted) {
    return <div className="h-[600px] animate-pulse rounded-xl border bg-card" />;
  }

  return (
    <div className="mdp-calendar rounded-xl border bg-card p-2 sm:p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
          list: "List",
        }}
        firstDay={1}
        nowIndicator
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{ hour: "numeric", minute: "2-digit", hour12: false, omitZeroMinute: true }}
        dayHeaderContent={dayHeaderContent}
        allDaySlot={false}
        editable
        selectable
        selectMirror
        events={fcEvents}
        eventDrop={onDrop}
        eventResize={onResize}
        select={onSelect}
        eventClick={onEventClick}
      />
      {editing && <EditModal event={editing} onClose={() => setEditingId(null)} />}
    </div>
  );
}
