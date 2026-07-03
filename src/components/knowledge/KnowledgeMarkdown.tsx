"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Markdown renderer for knowledge-base articles.
 * Supports GitHub-flavored Markdown (tables, task lists) and KaTeX math
 * via `$inline$` and `$$block$$` delimiters.
 */
export function KnowledgeMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-body knowledge-article", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
