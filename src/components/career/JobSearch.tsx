"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  Loader2,
  X,
  Wand2,
  Copy,
  Check,
  Save,
  MapPin,
} from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { postAI } from "@/lib/aiClient";
import type { AIJobPosting, ApplicationResponse } from "@/lib/ai/schemas";
import type { JobPosting } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/Markdown";
import { cn } from "@/lib/utils";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {score}% match
    </span>
  );
}

function ApplicationDialog({
  job,
  onClose,
}: {
  job: JobPosting;
  onClose: () => void;
}) {
  const cvs = useCareerStore((s) => s.cvs);
  const addApplication = useCareerStore((s) => s.addApplication);
  const [cvId, setCvId] = React.useState(cvs[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ApplicationResponse | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const cv = cvs.find((c) => c.id === cvId);

  const generate = async () => {
    if (!cv) return;
    setLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const res = await postAI<{ data: ApplicationResponse }>("/api/ai/application", {
        cvMarkdown: cv.markdown,
        job: { title: job.title, company: job.company, description: job.description },
        memory,
      });
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the application.");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    addApplication({
      company: job.company,
      role: job.title,
      status: "preparing",
      cvVersionId: cvId,
      coverLetter: result?.coverLetter,
      postingId: job.id,
    });
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold">Prepare application</h3>
            <p className="text-xs text-muted-foreground">
              {job.title} @ {job.company}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground">CV:</label>
            <select
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {cvs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.language})
                </option>
              ))}
            </select>
            <Button onClick={generate} disabled={loading || !cv} className="ml-auto">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Adapt CV + cover letter
            </Button>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          {result && (
            <div className="space-y-4">
              <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Cover letter</p>
                <div className="relative">
                  <textarea
                    value={result.coverLetter}
                    onChange={(e) => setResult({ ...result, coverLetter: e.target.value })}
                    rows={8}
                    className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => {
                      navigator.clipboard?.writeText(result.coverLetter);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              {result.tips.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="mb-1 text-xs font-semibold text-primary">Tips</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {result.tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <details>
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                  Adapted CV
                </summary>
                <div className="mt-2 rounded-lg border p-3">
                  <Markdown>{result.adaptedCV}</Markdown>
                </div>
              </details>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <p className="text-xs text-muted-foreground">
            Submitting the application is up to you (to avoid bans).
          </p>
          <Button onClick={save} disabled={!result || saved}>
            {saved ? <Check className="size-4" /> : <Save className="size-4" />}
            {saved ? "Saved" : "Save as application"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JobSearch() {
  const postings = useCareerStore((s) => s.postings);
  const setPostings = useCareerStore((s) => s.setPostings);
  const cvs = useCareerStore((s) => s.cvs);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeJob, setActiveJob] = React.useState<JobPosting | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const cvSummary = cvs[0]?.markdown.slice(0, 800) ?? "";
      const res = await postAI<{ data: { jobs: AIJobPosting[] } }>("/api/ai/jobs", {
        memory,
        cvSummary,
        query,
      });
      setPostings(res.data.jobs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find jobs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Search className="size-4" />
        </span>
        <CardTitle className="text-sm">AI job search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="e.g. Junior ML Engineer, remote"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Search
          </Button>
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {postings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The AI finds and ranks suitable jobs based on your goal and CV.
          </p>
        ) : (
          <div className="space-y-2">
            {postings.map((job) => (
              <div key={job.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">{job.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {job.company} ·{" "}
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="size-3" />
                        {job.location}
                      </span>
                    </p>
                  </div>
                  <ScoreBadge score={job.matchScore} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={() => setActiveJob(job)}>
                    <Wand2 className="size-4" />
                    Prepare application
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {activeJob && (
        <ApplicationDialog job={activeJob} onClose={() => setActiveJob(null)} />
      )}
    </Card>
  );
}
