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

      if (res.ok && json.data?.role && json.data.role !== "Вакансия") {
        saveParsed(json.data);
        return;
      }

      // Could not parse — show manual fields prefilled with URL
      const partial = (json.data ?? json.partial) as ParsedJobPosting | undefined;
      setCompany(partial?.company && partial.company !== "Неизвестная компания" ? partial.company : "");
      setRole(partial?.role && partial.role !== "Вакансия" ? partial.role : "");
      setShowFields(true);
      setError("Не удалось прочитать страницу. Впиши название и компанию вручную.");
    } catch {
      setShowFields(true);
      setError("Не удалось прочитать ссылку. Впиши название и компанию вручную.");
    } finally {
      setLoading(false);
    }
  };

  const saveManual = () => {
    if (!role.trim() || !company.trim()) {
      setError("Нужны название вакансии и компания");
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
        Откликнулась сама (hh / LinkedIn / Telegram)? Вставь ссылку и нажми «Добавить».
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addFromUrl();
          }}
          placeholder="https://hh.ru/vacancy/… или linkedin.com/jobs/…"
          className="flex-1 rounded-md border bg-background px-3 py-2.5 text-sm"
        />
        <Button
          type="button"
          onClick={() => void addFromUrl()}
          disabled={loading || !url.trim()}
          className="shrink-0 gap-1.5"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Добавить
        </Button>
      </div>

      {error ? <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p> : null}

      {showFields ? (
        <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Название вакансии"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Компания"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Button type="button" size="sm" onClick={saveManual} className="sm:col-span-2 w-fit gap-1.5">
            <Plus className="size-3.5" />
            Сохранить отклик
          </Button>
        </div>
      ) : null}
    </div>
  );
}
