"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import type { ParsedJobPosting } from "@/types";
import { Button } from "@/components/ui/button";

export function JobAddForm() {
  const addFromParsed = useCareerStore((s) => s.addApplicationFromParsed);
  const [url, setUrl] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState("");
  const [showFields, setShowFields] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const saveParsed = (parsed: ParsedJobPosting) => {
    addFromParsed(parsed, "applied");
    setUrl("");
    setCompany("");
    setRole("");
    setShowFields(false);
    setError(null);
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

      if (
        res.ok &&
        json.data?.role &&
        json.data.role !== "Job" &&
        json.data.role !== "Вакансия" &&
        !/^#\w/.test(json.data.role)
      ) {
        saveParsed(json.data);
        return;
      }

      const partial = (json.data ?? json.partial) as ParsedJobPosting | undefined;
      setCompany(
        partial?.company &&
          partial.company !== "Unknown company" &&
          partial.company !== "Неизвестная компания"
          ? partial.company
          : ""
      );
      setRole(
        partial?.role && partial.role !== "Job" && partial.role !== "Вакансия"
          ? partial.role
          : ""
      );
      setShowFields(true);
      setError("Couldn’t read the page fully. Confirm the role and company.");
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
      description: "",
      url: url.trim(),
      source: "manual",
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Applied yourself (hh / LinkedIn / Telegram)? Paste the link and click Add.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addFromUrl();
          }}
          placeholder="https://hh.ru/vacancy/… or linkedin.com/jobs/…"
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
            placeholder="Job title"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
