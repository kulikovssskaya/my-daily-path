import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowUpRight, Clock, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
  getAllArticles,
  getPendingSections,
} from "@/lib/knowledgeBase";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function KnowledgeIndexPage() {
  const articles = getAllArticles();
  const pending = getPendingSections();

  return (
    <PageShell
      title="Knowledge Base"
      description="ML & Data Analytics — импорт из Notion"
      icon={<BookOpen className="size-5" />}
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Доступные разделы
          </h2>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока нет импортированных статей.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/knowledge/${a.slug}`}
                  className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {a.section}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <h3 className="font-semibold leading-tight">{a.title}</h3>
                  {a.summary && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {a.summary}
                    </p>
                  )}
                  {a.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.tags.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.updated && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Обновлено: {a.updated}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {pending.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="size-3.5" /> Ожидают импорта
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {pending.map((p) => (
                <a
                  key={p.section}
                  href={p.notion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg border border-dashed bg-card/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>{p.section}</span>
                  <ArrowUpRight className="size-3.5 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
