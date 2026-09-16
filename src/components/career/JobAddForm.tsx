"use client";

import * as React from "react";
import { Link2, Loader2, Plus, FileText } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import type { ParsedJobPosting } from "@/types";
import { Button } from "@/components/ui/button";

const DEFAULT_VACANCY_URL = "https://hh.ru/vacancy/137379743";

export function JobAddForm() {
  const addFromParsed = useCareerStore((s) => s.addApplicationFromParsed);
  const applications = useCareerStore((s) => s.applications);
  const [url, setUrl] = React.useState(DEFAULT_VACANCY_URL);
  const [manualText, setManualText] = React.useState("");
  const [showManual, setShowManual] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<ParsedJobPosting | null>(null);

  const parseAndPreview = async (overrideUrl?: string) => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: (overrideUrl ?? url).trim() || undefined,
          manualText: manualText.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.fallback) {
          setShowManual(true);
          setError(json.error ?? "Парсинг недоступен — заполните вручную");
          if (json.partial) setPreview(json.partial);
          return;
        }
        throw new Error(json.error ?? "Ошибка парсинга");
      }
      setPreview(json.data);
      if (json.data.parseError) {
        setShowManual(true);
        setError(json.data.parseError);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось распарсить");
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  };

  const save = (parsed?: ParsedJobPosting) => {
    const item = parsed ?? preview;
    if (!item) return;
    addFromParsed(item, "applied");
    setUrl("");
    setManualText("");
    setPreview(null);
    setShowManual(false);
    setError(null);
  };

  React.useEffect(() => {
    const hasFirst = applications.some((a) => a.url === DEFAULT_VACANCY_URL);
    if (hasFirst || applications.length > 0) return;

    void (async () => {
      try {
        const res = await fetch("/api/jobs/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: DEFAULT_VACANCY_URL }),
        });
        const json = await res.json();
        const data = res.ok ? json.data : json.partial;
        if (data) {
          setPreview(data);
          addFromParsed(data, "applied");
        }
      } catch {
        /* user can add manually */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time bootstrap
  }, []);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4 text-primary" />
        Добавить отклик по ссылке
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hh.ru/vacancy/… или LinkedIn"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button
          type="button"
          onClick={() => parseAndPreview()}
          disabled={loading || (!url.trim() && !manualText.trim())}
          className="shrink-0"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Разобрать"}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <FileText className="size-3.5" />
        {showManual ? "Скрыть ручной ввод" : "Вставить текст вручную (если парсинг заблокирован)"}
      </button>

      {showManual ? (
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={4}
          placeholder="Название — Компания&#10;Краткое описание вакансии…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      ) : null}

      {error ? <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p> : null}

      {preview ? (
        <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
          <div>
            <span className="font-medium">{preview.role}</span>
            <span className="text-muted-foreground"> @ {preview.company}</span>
          </div>
          {preview.description ? (
            <p className="line-clamp-3 text-xs text-muted-foreground">{preview.description}</p>
          ) : null}
          {preview.url ? (
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {preview.url}
            </a>
          ) : null}
          <Button type="button" size="sm" onClick={() => save()} className="gap-1.5">
            <Plus className="size-3.5" />
            Откликнулась сегодня
          </Button>
        </div>
      ) : null}
    </div>
  );
}
