import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { KnowledgeMarkdown } from "@/components/knowledge/KnowledgeMarkdown";
import { getAllArticles, getArticle } from "@/lib/knowledgeBase";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  return { title: article ? article.title : "Knowledge Base" };
}

export default async function KnowledgeArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) notFound();

  return (
    <PageShell
      title={article.title}
      description={article.section}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/knowledge"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Все разделы
          </Link>
          {article.source && (
            <a
              href={article.source.split(" ")[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Источник (Notion) <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        {article.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <article className="rounded-2xl border bg-card p-5 sm:p-7">
          <KnowledgeMarkdown>{article.body}</KnowledgeMarkdown>
        </article>

        {article.imported && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Импортировано: {article.imported}
            {article.updated ? ` · Обновлено: ${article.updated}` : ""}
          </p>
        )}
      </div>
    </PageShell>
  );
}
