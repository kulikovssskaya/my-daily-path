// ============================================================
// Domain types for My Daily Path
// Shared across stores and AI endpoints.
// ============================================================

export type ISODate = string; // e.g. "2026-07-01T09:30:00.000Z"

// ---------- Long-term memory (feeds every AI prompt) ----------
export interface MemoryNote {
  id: string;
  text: string;
  createdAt: ISODate;
}

export type Pace = "slow" | "normal" | "fast";

export interface UserMemory {
  goals: string[];
  values: string[];
  constraints: string[];
  learningPace: Record<string, Pace>; // { math: "slow" }
  preferences: string[];
  notes: MemoryNote[];
}

// ---------- Schedule ----------
export type EventCategory =
  | "learning"
  | "work"
  | "health"
  | "meal"
  | "rest"
  | "commute"
  | "habit"
  | "other";

export type EventStatus = "planned" | "done" | "skipped";
export type Priority = 1 | 2 | 3;
export type Energy = "low" | "mid" | "high";

export interface ScheduleEvent {
  id: string;
  title: string;
  category: EventCategory;
  start: ISODate;
  end: ISODate;
  status: EventStatus;
  priority: Priority;
  energy?: Energy;
  notes?: string;
  meta?: { track?: string; rizeEntryId?: string; rizeTouched?: boolean };
  lastModifiedAt?: ISODate;
  locked?: boolean;
  lockedAt?: ISODate;
}

export interface Habit {
  id: string;
  title: string;
  weekdays: number[]; // 0 = Sunday ... 6 = Saturday
  time: string; // "18:00"
  duration: number; // minutes
  category: EventCategory;
  lastModifiedAt?: ISODate;
  locked?: boolean;
  lockedAt?: ISODate;
}

// ---------- Progress ----------
export type TrackType = "language" | "programming" | "ml" | "other";

export interface LearningTrack {
  id: string;
  name: string;
  type: TrackType;
  targetHours?: number;
  loggedHours: number;
  streak: number;
  lastActive?: ISODate;
}

/** Primary tracker statuses (Kanban columns). Legacy values kept for import compat. */
export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "applied" // Откликнулась
  | "interview" // Интервью
  | "rejected" // Отказ
  | "ignored" // Игнор
  | "offer";

export type JobSource = "hh.ru" | "linkedin" | "telegram" | "website" | "manual";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  /** Vacancy URL (hh.ru, LinkedIn, company site, Telegram link). */
  url?: string;
  /** Short description or snippet from the posting. */
  description?: string;
  source?: JobSource;
  appliedAt?: ISODate;
  createdAt?: ISODate;
  updatedAt?: ISODate;
  notes?: string;
  interviewDate?: ISODate;
  cvVersionId?: string;
  coverLetter?: string;
  postingId?: string;
  /** One-time follow-up prompt shown after 3–5 days in "applied" status. */
  followUpPromptedAt?: ISODate;
  /** User dismissed stale-job suggestion (14+ days without response). */
  staleDismissedAt?: ISODate;
  /** Added via Telegram bot (for sync). */
  telegramMessageId?: number;
}

/** Parsed vacancy payload from URL or manual paste. */
export interface ParsedJobPosting {
  company: string;
  role: string;
  description: string;
  url: string;
  source: JobSource;
  parseError?: string;
}

/** Funnel & activity metrics for the job tracker dashboard. */
export interface JobTrackerStats {
  today: number;
  yesterday: number;
  thisWeek: number;
  activeCount: number;
  totalCount: number;
  interviewRate: number;
  rejectionRate: number;
  ignoreRate: number;
  byStatus: Record<ApplicationStatus, number>;
  dailyCounts: { key: string; label: string; count: number }[];
}

export interface JobTrackerSettings {
  /** Linked Telegram chat ID for bot sync & reminders. */
  telegramChatId?: string;
  /** Auto-move stale "applied" to ignored after N days (0 = off). */
  autoIgnoreAfterDays: number;
  /** Days before first follow-up prompt (3–5). */
  followUpAfterDays: number;
}

export interface DailyReport {
  id: string;
  date: ISODate;
  summary: string;
  recommendations: string[];
}

export interface WeeklyReport {
  id: string;
  weekKey: string;
  weekLabel: string;
  date: ISODate;
  summary: string;
  totalLearningHours?: number;
  highlights: string[];
  topicsStudied: string[];
  dynamics: string;
  strengths: string[];
  improvements: string[];
  nextWeekFocus: string[];
}

/** A free-form note about what the user actually did on a given day. */
export type DailyLogKind = "note" | "evening-summary";

export interface DailyLog {
  id: string;
  date: ISODate; // YYYY-MM-DD
  text: string;
  createdAt: ISODate;
  /** Linked calendar event when "Also add to calendar" was used. */
  calendarEventId?: string;
  /** Linked work-timer session, if logged via timer. */
  timerSessionId?: string;
  /** How the note was created (evening LinkedIn wrap, free note, …). */
  kind?: DailyLogKind;
  /** Linked career LinkedIn draft, if saved from evening wrap. */
  linkedInPostId?: string;
  lastModifiedAt?: ISODate;
  locked?: boolean;
  lockedAt?: ISODate;
}

/** A work-timer session — editable if you forgot to stop. */
export interface TimerSession {
  id: string;
  title: string;
  category: EventCategory;
  track: string;
  kind: "stopwatch" | "pomodoro";
  startedAt: number;
  endedAt: number | null;
  savedToCalendar: boolean;
  calendarEventId?: string;
  logId?: string;
}

// ---------- Cooking ----------
export interface FridgeItem {
  id: string;
  name: string;
  qty?: string;
  addedAt: ISODate;
  expiresAt?: ISODate;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  timeMinutes: number;
  calories?: number;
  favorite: boolean;
  usesItems: string[];
  createdAt: ISODate;
}

// ---------- Career ----------
export interface CVVersion {
  id: string;
  label: string;
  language: string;
  targetRole?: string;
  markdown: string;
  /** Optional uploaded file (e.g. a PDF) stored as a data URL for preview/download. */
  fileName?: string;
  fileType?: string;
  fileDataUrl?: string;
  updatedAt: ISODate;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  matchScore: number; // 0..100
  url?: string;
  source: string;
  createdAt: ISODate;
}

export interface LinkedInPostIdea {
  id: string;
  topic: string;
  draft: string;
  scheduledFor?: ISODate;
  posted: boolean;
  createdAt: ISODate;
  /** Calendar day this post summarizes (YYYY-MM-DD). */
  sourceDate?: ISODate;
  /** Linked daily log when saved from evening wrap. */
  dailyLogId?: string;
  eveningWrap?: boolean;
}

// ---------- Daily English (English Boost) ----------
export type EnglishCategory =
  | "everyday"
  | "it"
  | "ml"
  | "analytics"
  | "phrasal"
  | "idiom";

export type EnglishDifficulty = "B1" | "B1+" | "B2";

export interface EnglishVocabWord {
  id: string;
  term: string;
  translationRu: string;
  definition: string;
  example: string;
  category: EnglishCategory;
  difficulty: EnglishDifficulty;
  userExample?: string;
  createdAt: ISODate;
}

export interface EnglishWordSRS {
  wordId: string;
  term: string;
  intervalIndex: number;
  nextReviewAt: ISODate;
  lastReviewedAt?: ISODate;
  timesCorrect: number;
  timesIncorrect: number;
  mastered: boolean;
}

export type EnglishSessionPhase =
  | "drop"
  | "select"
  | "flashcards"
  | "quiz"
  | "review"
  | "complete";

export interface EnglishDailySession {
  id: string;
  dateKey: string;
  dropWordIds: string[];
  selectedWordIds: string[];
  phase: EnglishSessionPhase;
  flashcardIndex: number;
  flashcardResults: Record<string, "know" | "unknown">;
  matchingCorrect: number;
  matchingDone: boolean;
  quizProgress: number;
  quizCorrect: number;
  reviewAnswers: Record<string, boolean>;
  finalScore?: number;
  recommendations?: string[];
  completedAt?: ISODate;
}

export interface EnglishDayRecord {
  id: string;
  dateKey: string;
  wordIds: string[];
  finalScore: number;
  completedAt: ISODate;
}

export interface EnglishSettings {
  dailyWordCount: number;
  dropPoolSize: number;
  focusCategories: EnglishCategory[];
  level: "B1" | "B1-B2";
}

export interface EnglishStats {
  streak: number;
  lastStudyDate?: string;
  totalWordsLearned: number;
  totalSessionsCompleted: number;
  averageScore: number;
}
