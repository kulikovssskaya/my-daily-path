import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CVVersion,
  JobPosting,
  JobApplication,
  LinkedInPostIdea,
  ApplicationStatus,
  JobTrackerSettings,
  ParsedJobPosting,
} from "@/types";
import type { AIJobPosting } from "@/lib/ai/schemas";
import { uid } from "@/lib/utils";

const STARTER_CV = `# First Last
Aspiring Machine Learning Engineer

## About
Driven learner mastering Machine Learning with the goal of landing an offer in 3–4 months.

## Skills
- Python, pandas, NumPy
- ML basics: regression, classification
- SQL, Git

## Experience
- Personal data-analysis projects

## Education
- Self-taught (courses, practice)
`;

const DEFAULT_TRACKER_SETTINGS: JobTrackerSettings = {
  autoIgnoreAfterDays: 14,
  followUpAfterDays: 4,
};

function mergeApplicationsByUrl(
  local: JobApplication[],
  incoming: JobApplication[]
): JobApplication[] {
  const map = new Map(local.map((a) => [a.id, a]));
  for (const app of incoming) {
    const byUrl = local.find((a) => a.url && app.url && a.url === app.url);
    const byMonitorId = local.find((a) => a.id === app.id);
    const existing = byUrl ?? byMonitorId;
    if (existing) {
      map.set(existing.id, {
        ...existing,
        ...app,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      });
    } else {
      map.set(app.id, app);
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.appliedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.appliedAt ?? a.createdAt ?? 0).getTime()
  );
}

interface CareerState {
  cvs: CVVersion[];
  postings: JobPosting[];
  applications: JobApplication[];
  posts: LinkedInPostIdea[];
  linkedInConnected: boolean;
  jobTrackerSettings: JobTrackerSettings;

  addCV: (label: string, language: string, targetRole?: string) => string;
  addFileCV: (input: {
    label: string;
    language: string;
    fileName: string;
    fileType: string;
    fileDataUrl: string;
    targetRole?: string;
  }) => string;
  updateCV: (id: string, patch: Partial<CVVersion>) => void;
  removeCV: (id: string) => void;

  setPostings: (jobs: AIJobPosting[]) => void;

  addApplication: (a: Omit<JobApplication, "id">) => string;
  addApplicationFromParsed: (
    parsed: ParsedJobPosting,
    status?: ApplicationStatus
  ) => string;
  updateApplication: (id: string, patch: Partial<JobApplication>) => void;
  setApplicationStatus: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;
  markFollowUpPrompted: (id: string) => void;
  dismissStale: (id: string) => void;
  mergeTelegramApplications: (incoming: JobApplication[]) => void;
  /** Replace bot-imported apps (search-job-*) with incoming; drop older than since. */
  syncMonitorApplications: (incoming: JobApplication[], since?: string) => void;
  setJobTrackerSettings: (patch: Partial<JobTrackerSettings>) => void;

  addPosts: (
    ideas: {
      topic: string;
      draft: string;
      sourceDate?: string;
      eveningWrap?: boolean;
      dailyLogId?: string;
    }[]
  ) => string[];
  updatePost: (id: string, patch: Partial<LinkedInPostIdea>) => void;
  removePost: (id: string) => void;

  setLinkedInConnected: (v: boolean) => void;
}

const seedCV: CVVersion = {
  id: uid("cv"),
  label: "ML Engineer (EN)",
  language: "English",
  targetRole: "Machine Learning Engineer",
  markdown: STARTER_CV,
  updatedAt: new Date().toISOString(),
};

export const useCareerStore = create<CareerState>()(
  persist(
    (set) => ({
      cvs: [seedCV],
      postings: [],
      applications: [],
      posts: [],
      linkedInConnected: false,
      jobTrackerSettings: DEFAULT_TRACKER_SETTINGS,

      addCV: (label, language, targetRole) => {
        const id = uid("cv");
        set((s) => ({
          cvs: [
            ...s.cvs,
            {
              id,
              label,
              language,
              targetRole,
              markdown: `# ${label}\n\n`,
              updatedAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      addFileCV: ({ label, language, fileName, fileType, fileDataUrl, targetRole }) => {
        const id = uid("cv");
        set((s) => ({
          cvs: [
            ...s.cvs,
            {
              id,
              label,
              language,
              targetRole,
              markdown: "",
              fileName,
              fileType,
              fileDataUrl,
              updatedAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      updateCV: (id, patch) =>
        set((s) => ({
          cvs: s.cvs.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),
      removeCV: (id) => set((s) => ({ cvs: s.cvs.filter((c) => c.id !== id) })),

      setPostings: (jobs) =>
        set(() => ({
          postings: jobs.map((j) => ({
            id: uid("job"),
            title: j.title,
            company: j.company,
            location: j.location,
            description: j.description,
            matchScore: j.matchScore,
            url: j.url,
            source: j.source,
            createdAt: new Date().toISOString(),
          })),
        })),
      addApplication: (a) => {
        const id = uid("app");
        const now = new Date().toISOString();
        set((s) => ({
          applications: [
            {
              ...a,
              id,
              createdAt: a.createdAt ?? now,
              updatedAt: now,
              appliedAt:
                a.appliedAt ??
                (a.status === "applied" ? now : undefined),
            },
            ...s.applications,
          ],
        }));
        return id;
      },
      addApplicationFromParsed: (parsed, status = "applied") => {
        const id = uid("app");
        const now = new Date().toISOString();
        set((s) => ({
          applications: [
            {
              id,
              company: parsed.company,
              role: parsed.role,
              description: parsed.description,
              url: parsed.url,
              source: parsed.source,
              status,
              appliedAt: status === "applied" ? now : undefined,
              createdAt: now,
              updatedAt: now,
            },
            ...s.applications,
          ],
        }));
        return id;
      },
      updateApplication: (id, patch) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? { ...a, ...patch, updatedAt: new Date().toISOString() }
              : a
          ),
        })),
      setApplicationStatus: (id, status) =>
        set((s) => ({
          applications: s.applications.map((a) => {
            if (a.id !== id) return a;
            const now = new Date().toISOString();
            return {
              ...a,
              status,
              updatedAt: now,
              appliedAt:
                status === "applied" && !a.appliedAt ? now : a.appliedAt,
            };
          }),
        })),
      removeApplication: (id) =>
        set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),
      markFollowUpPrompted: (id) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? { ...a, followUpPromptedAt: new Date().toISOString() }
              : a
          ),
        })),
      dismissStale: (id) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? { ...a, staleDismissedAt: new Date().toISOString() }
              : a
          ),
        })),
      mergeTelegramApplications: (incoming) =>
        set((s) => ({ applications: mergeApplicationsByUrl(s.applications, incoming) })),
      syncMonitorApplications: (incoming, since = "2026-09-16") =>
        set((s) => {
          const manual = s.applications.filter((a) => {
            if (a.id.startsWith("search-job-")) return false;
            const key = (a.appliedAt ?? a.createdAt ?? "").slice(0, 10);
            return !key || key >= since;
          });
          const bot = incoming.filter((a) => {
            const key = (a.appliedAt ?? a.createdAt ?? "").slice(0, 10);
            return key >= since;
          });
          return {
            applications: mergeApplicationsByUrl(manual, bot),
          };
        }),
      setJobTrackerSettings: (patch) =>
        set((s) => ({
          jobTrackerSettings: { ...s.jobTrackerSettings, ...patch },
        })),

      addPosts: (ideas) => {
        const ids: string[] = [];
        set((s) => ({
          posts: [
            ...ideas.map((i) => {
              const id = uid("post");
              ids.push(id);
              return {
                id,
                topic: i.topic,
                draft: i.draft,
                posted: false,
                createdAt: new Date().toISOString(),
                sourceDate: i.sourceDate,
                eveningWrap: i.eveningWrap,
                dailyLogId: i.dailyLogId,
              };
            }),
            ...s.posts,
          ].slice(0, 40),
        }));
        return ids;
      },
      updatePost: (id, patch) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      setLinkedInConnected: (v) => set({ linkedInConnected: v }),
    }),
    { name: "mdp-career" }
  )
);
