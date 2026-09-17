import type { ApplicationStatus, JobApplication, JobSource } from "@/types";

/** Payload from SearchJob monitor (SQLite export). */
export interface MonitorVacancyPayload {
  id: number;
  company: string;
  title: string;
  url: string;
  description?: string;
  first_source?: string;
  status?: string;
  action?: string;
  action_at?: string;
  updated_at?: string;
  detected_at?: string;
  message_ru?: string;
  message_en?: string;
  band?: string;
  score?: number;
  comment?: string;
}

export function mapMonitorSource(firstSource?: string): JobSource {
  const s = (firstSource ?? "").toLowerCase();
  if (s.startsWith("hh.ru") || s.includes("hh.ru")) return "hh.ru";
  if (s.startsWith("linkedin") || s.includes("linkedin")) return "linkedin";
  if (s.includes("habr")) return "habr";
  if (s.startsWith("telegram") || s.includes("t.me")) return "telegram";
  return "website";
}

export function mapMonitorStatus(
  vacancyStatus?: string,
  action?: string
): ApplicationStatus {
  const status = (vacancyStatus ?? "").toUpperCase();
  const act = (action ?? "").toLowerCase();

  if (status === "INTERVIEW" || act === "interview") return "interview";
  if (status === "OFFER" || act === "offer") return "offer";
  if (status === "REJECTED_BY_USER" || act === "rejected") return "rejected";
  if (status === "SKIPPED" || act === "skipped") return "ignored";
  if (status === "APPLIED" || status === "REPLIED" || act === "sent" || act === "replied") {
    return "applied";
  }
  return "applied";
}

export function monitorVacancyToApplication(v: MonitorVacancyPayload): JobApplication {
  const now = new Date().toISOString();
  const cover = v.message_ru || v.message_en;
  const notesParts = [
    v.band && v.score != null ? `[${v.band} ${v.score}/100]` : null,
    v.comment ? v.comment : null,
  ].filter(Boolean);

  return {
    id: `search-job-${v.id}`,
    company: v.company || "Неизвестная компания",
    role: v.title || "Вакансия",
    status: mapMonitorStatus(v.status, v.action),
    url: v.url,
    description: (v.description ?? "").slice(0, 500),
    source: mapMonitorSource(v.first_source),
    appliedAt: v.action_at ?? v.updated_at ?? now,
    createdAt: v.detected_at ?? v.action_at ?? now,
    updatedAt: v.updated_at ?? v.action_at ?? now,
    coverLetter: cover,
    notes: notesParts.length ? notesParts.join(" ") : undefined,
  };
}
