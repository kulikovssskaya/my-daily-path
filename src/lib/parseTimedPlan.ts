import type { PlanResponse, AIEvent } from "@/lib/ai/schemas";
import type { EventCategory, Habit } from "@/types";
import { formatDayKey } from "@/lib/planSafety";

const pad = (n: number) => String(n).padStart(2, "0");

export function isoAt(date: Date, minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    h
  )}:${pad(m)}:00`;
}

const KEYWORDS: { re: RegExp; category: EventCategory; track?: string }[] = [
  { re: /break|перерыв|пауза/i, category: "rest" },
  { re: /breakfast|lunch|dinner|обед|ужин|завтрак|meal|еда|поесть/i, category: "meal" },
  {
    re: /папа|с папой|\bdad\b|father|подготовк.*занят|занятие.*пап/i,
    category: "learning",
    track: "With dad",
  },
  { re: /engl|англ|язык|language|vocab|words|слов/i, category: "learning", track: "English" },
  {
    re: /stepik|степик|pandas|numpy|python|code|coding|program|программир|код/i,
    category: "learning",
    track: "Python",
  },
  {
    re: /\bml\b|machine|neural|нейросет|нейронн|matplotlib|seaborn|eda|catboost|lightgbm|визуализац|анализ/i,
    category: "learning",
    track: "ML",
  },
  { re: /math|математик/i, category: "learning", track: "Math" },
  { re: /work|project|task|работ|проект|задач|resume|cv|applicat|отклик/i, category: "work" },
  { re: /workout|sport|gym|run|exercise|yoga|йога|трениров|спорт|зал|бег|vocal|вокал|зарядк/i, category: "health" },
  {
    re: /massage|masc|walk|medit|relax|масс|отдых|прогул|медит|read|чтен|book|дневник|журнал|конспект/i,
    category: "rest",
  },
  { re: /groc|shopping|продукт|магазин|купить/i, category: "other" },
];

function guessCategory(text: string): { category: EventCategory; track?: string } {
  for (const k of KEYWORDS) if (k.re.test(text)) return { category: k.category, track: k.track };
  return { category: "other" };
}

const TIME_RANGE = /(\d{1,2})[:.](\d{2})\s*[–—\-−~]\s*(\d{1,2})[:.](\d{2})/;
const TIME_START = /^(\d{1,2})[:.](\d{2})\b/;
const DECORATION = /^[\s▼▲►▸•·—–\-*=|]+$/;
const META_LINE =
  /^(?:add|put|schedule|plan|добавь|добавить|запланируй|внеси|в расписание|only|just|только|nothing|ничего|больше|no extra)/i;

export interface TimedBlock {
  startMin: number;
  endMin: number;
  title: string;
  category: EventCategory;
  track?: string;
}

function cleanTitlePart(s: string): string {
  return s
    .replace(TIME_RANGE, "")
    .replace(/^[\s▼▲►▸•·—–\-*|]+/, "")
    .replace(/[\s·]+$/, "")
    .trim();
}

function pickTitle(parts: string[]): string {
  const candidates = parts
    .filter(Boolean)
    .filter((p) => !DECORATION.test(p))
    .filter((p) => !/^блок\s*\d+/i.test(p))
    .filter((p) => !META_LINE.test(p));
  let title = candidates.sort((a, b) => b.length - a.length)[0] ?? parts[0] ?? "Block";
  if (title.length > 80) title = title.slice(0, 80).trim() + "…";
  return title;
}

/** Parse HH:MM–HH:MM blocks from multi-line schedule text. */
export function parseExplicitBlocks(text: string): TimedBlock[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: TimedBlock[] = [];
  let current: { startMin: number; endMin: number; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const title = pickTitle(current.parts);
    const joined = current.parts.join(" ");
    const { category, track } = guessCategory(joined);
    blocks.push({ startMin: current.startMin, endMin: current.endMin, title, category, track });
    current = null;
  };

  for (const line of lines) {
    if (META_LINE.test(line) && !TIME_RANGE.test(line)) continue;

    const range = line.match(TIME_RANGE);
    if (range) {
      flush();
      const startMin = parseInt(range[1], 10) * 60 + parseInt(range[2], 10);
      let endMin = parseInt(range[3], 10) * 60 + parseInt(range[4], 10);
      if (endMin <= startMin) endMin = startMin + 30;
      current = { startMin, endMin, parts: [] };
      const inline = cleanTitlePart(line);
      if (inline) current.parts.push(inline);
      continue;
    }

    const start = line.match(TIME_START);
    if (start && !current) {
      const startMin = parseInt(start[1], 10) * 60 + parseInt(start[2], 10);
      current = { startMin, endMin: startMin + 60, parts: [] };
      const inline = line.replace(TIME_START, "").replace(/^[\s·–\-]+/, "").trim();
      if (inline) current.parts.push(inline);
      continue;
    }

    if (current) {
      if (DECORATION.test(line)) continue;
      if (META_LINE.test(line)) continue;
      current.parts.push(line);
    }
  }
  flush();

  return blocks;
}

export function isForTomorrow(instruction: string): boolean {
  // Note: \b does not work with Cyrillic in JavaScript — use plain substring checks.
  return /(?:^|[\s,.:;])*(?:tomorrow|на\s+завтра|завтра)(?:[\s,.:;]|$)/i.test(instruction)
    || /tomorrow/i.test(instruction)
    || /на\s+завтра/i.test(instruction)
    || /завтра/i.test(instruction);
}

export function isForToday(instruction: string): boolean {
  return /(?:^|[\s,.:;])*(?:today|сегодня|на\s+сегодня)(?:[\s,.:;]|$)/i.test(instruction)
    || /today/i.test(instruction)
    || /сегодня/i.test(instruction)
    || /на\s+сегодня/i.test(instruction);
}

export function isOnlyExplicit(instruction: string): boolean {
  return /(?:only|just|только|nothing else|ничего лишн|больше лишн|no extra|only this|ничего не добавляй|не добавляй)/i.test(
    instruction
  );
}

/** Parse "from 11:30" / "с 11:30" / "only from 11:30" */
export function parseStartFromMin(instruction: string): number | null {
  const m = instruction.match(
    /(?:only\s+)?(?:from|starting(?:\s+at)?|start\s+at)\s*(\d{1,2})[:.:](\d{2})|(?:только\s+)?(?:с|начиная\s+с)\s*(\d{1,2})[:.:](\d{2})/i
  );
  if (!m) return null;
  const h = parseInt(m[1] ?? m[3], 10);
  const min = parseInt(m[2] ?? m[4], 10);
  return h * 60 + min;
}

function habitEventsForDay(date: Date, habits: Habit[]): AIEvent[] {
  const wd = date.getDay();
  const out: AIEvent[] = [];
  for (const h of habits) {
    if (!h.weekdays.includes(wd)) continue;
    const [hh, mm] = h.time.split(":").map((x) => parseInt(x, 10));
    const startMin = (hh || 9) * 60 + (mm || 0);
    out.push({
      title: h.title,
      category: "habit",
      start: isoAt(date, startMin),
      end: isoAt(date, startMin + h.duration),
      priority: 2,
    });
  }
  return out;
}

/** Resolve which calendar day the timed blocks should land on. */
export function resolveTargetDay(instruction: string, now: Date, blockCount: number): Date {
  if (isForToday(instruction)) return new Date(now);

  if (isForTomorrow(instruction)) {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return d;
  }

  // Multi-block paste without an explicit day → tomorrow (safer than overwriting today).
  if (blockCount >= 2) {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return d;
  }

  return new Date(now);
}

function dayLabel(targetDay: Date, now: Date): string {
  const todayKey = formatDayKey(now);
  const targetKey = formatDayKey(targetDay);
  if (targetKey === todayKey) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (targetKey === formatDayKey(tomorrow)) return "tomorrow";
  return targetKey;
}

/** True when the user wants to revert the last schedule change. */
export function isUndoInstruction(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 120) return false;
  return (
    /^(?:undo|отмен(?:и|ить|а|и последн\w*)|верни(?:ть)?|откати(?:ть)?)/i.test(t) ||
    /^(?:cancel(?:\s+the)?\s+last|delete\s+last|remove\s+last)/i.test(t) ||
    /^удали(?:ть)?\s+последн\w*/i.test(t) ||
    /^отмени\s+последн\w*/i.test(t)
  );
}

/**
 * Build a plan from explicit time blocks in the instruction.
 * Returns null when no timed blocks are found.
 */
export function tryParseTimedPlan(
  instruction: string,
  nowIso: string,
  habits: Habit[] = []
): PlanResponse | null {
  const blocks = parseExplicitBlocks(instruction);
  if (blocks.length === 0) return null;

  const now = new Date(nowIso);
  const onlyExplicit = isOnlyExplicit(instruction);
  const targetDay = resolveTargetDay(instruction, now, blocks.length);
  const targetKey = formatDayKey(targetDay);
  const label = dayLabel(targetDay, now);

  let shiftMin = 0;
  const startFrom = parseStartFromMin(instruction);
  if (startFrom !== null) {
    shiftMin = startFrom - blocks[0].startMin;
  }

  const events: AIEvent[] = blocks.map((b) => {
    const startMin = b.startMin + shiftMin;
    const endMin = b.endMin + shiftMin;
    return {
      title: b.title,
      category: b.category,
      track: b.track,
      start: isoAt(targetDay, startMin),
      end: isoAt(targetDay, endMin),
      priority: b.category === "work" || b.category === "learning" ? 1 : 2,
    };
  });

  if (!onlyExplicit && habits.length) {
    events.push(...habitEventsForDay(targetDay, habits));
  }

  events.sort((a, b) => a.start.localeCompare(b.start));

  const shiftNote =
    startFrom !== null
      ? ` Shifted so the first block starts at ${pad(Math.floor(startFrom / 60))}:${pad(startFrom % 60)}.`
      : "";

  return {
    events,
    reasoning: `Parsed ${blocks.length} explicit time blocks for ${label} (${targetKey}).${shiftNote}${onlyExplicit ? " Added only the blocks you listed — no extras." : ""}`,
    summary: `Added ${blocks.length} blocks to ${label} (${targetKey})${startFrom !== null ? `, from ${pad(Math.floor(startFrom / 60))}:${pad(startFrom % 60)}` : ""}. Past days were not changed.`,
    memoryUpdates: [],
  };
}
