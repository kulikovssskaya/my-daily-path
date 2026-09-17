"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import type { ParsedJobPosting } from "@/types";
import { Button } from "@/components/ui/button";

function looksParsed(data: ParsedJobPosting | undefined): boolean {
  if (!data?.role) return false;
  if (data.role === "Job" || data.role === "Вакансия") return false;
  if (/^#\w/.test(data.role) || (data.role.match(/#/g) ?? []).length >= 2) return false;
  if (/\|\s*\w/.test(data.role)) return false; // "#tags | Author"
  return true;
}

export function JobAddForm() {
  const addFromParsed = useCareerStore((s) => s.addApplicationFromParsed);
  const [url, setUrl] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [source, setSource] = React.useState<ParsedJobPosting["source"]>("manual");
  const [showFields, setShowFields] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setUrl("");
    setCompany("");
    setRole("");
    setDescription("");
    setSource("manual");
    setShowFields(false);
    setError(null);
  };

  const saveParsed = (parsed: ParsedJobPosting) => {
    addFromParsed(parsed, "applied");
    reset();
  };

  const addFromUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json();
      const data = (res.ok ? json.data : json.partial) as ParsedJobPosting | undefined;

      // LinkedIn posts: always confirm (role/company extracted from body)
      const isLinkedInPost = /linkedin\.com\/posts\//i.test(trimmed);

      if (res.ok && looksParsed(data) && !isLinkedInPost) {
        saveParsed(data!);
        return;
      }

      setRole(looksParsed(data) ? data!.role : "");
      setCompany(
        data?.company &&
          data.company !== "Unknown company" &&
          data.company !== "Неизвестная компания"
          ? data.company
          : ""
      );
      setDescription(data?.description ?? "");
      setSource(data?.source ?? "manual");
      setShowFields(true);
      setError(
        looksParsed(data)
          ? "Check the title and company, then save."
          : "Couldn’t read the page fully. Enter the role and company."
      );
    } catch {
      setShowFields(true);
      setError("Couldn’t read the link. Enter the role and company manually.");
    } finally {
      setLoading(false);
    }
  };

  const saveManual = () => {
    if (!role.trim() || !company.trim()) {
      setError("Role and company are required");
      return;
    }
    saveParsed({
      role: role.trim(),
      company: company.trim(),
      description: description.trim(),
      url: url.trim(),
      source,
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Applied yourself (hh / LinkedIn / Telegram)? Paste the link and click Add.
        For LinkedIn posts we read the title and company from the post text.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addFromUrl();
          }}
          placeholder="https://hh.ru/vacancy/… or linkedin.com/posts/…"
          className="flex-1 rounded-md border bg-background px-3 py-2.5 text-sm"
        />
        <Button
          type="button"
          onClick={() => void addFromUrl()}
          disabled={loading || !url.trim()}
          className="shrink-0 gap-1.5"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>

      {error ? <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p> : null}

      {showFields ? (
        <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Job title (from post text)"
            className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <Button type="button" size="sm" onClick={saveManual} className="sm:col-span-2 w-fit gap-1.5">
            <Plus className="size-3.5" />
            Save application
          </Button>
        </div>
      ) : null}
    </div>
  );
}
