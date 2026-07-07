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

export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "applied"
  | "interview"
  | "rejected"
  | "offer";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedAt?: ISODate;
  cvVersionId?: string;
  coverLetter?: string;
  postingId?: string;
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
export interface DailyLog {
  id: string;
  date: ISODate; // YYYY-MM-DD
  text: string;
  createdAt: ISODate;
  /** Linked calendar event when "Also add to calendar" was used. */
  calendarEventId?: string;
  /** Linked work-timer session, if logged via timer. */
  timerSessionId?: string;
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
