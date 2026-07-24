import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CVVersion,
  JobPosting,
  JobApplication,
  LinkedInPostIdea,
  ApplicationStatus,
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

interface CareerState {
  cvs: CVVersion[];
  postings: JobPosting[];
  applications: JobApplication[];
  posts: LinkedInPostIdea[];
  linkedInConnected: boolean;

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
  setApplicationStatus: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;

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
        set((s) => ({ applications: [{ ...a, id }, ...s.applications] }));
        return id;
      },
      setApplicationStatus: (id, status) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  appliedAt:
                    status === "applied" ? new Date().toISOString() : a.appliedAt,
                }
              : a
          ),
        })),
      removeApplication: (id) =>
        set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),

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
