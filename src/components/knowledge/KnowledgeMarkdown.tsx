"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import {
  flattenMarkdownChildren,
  markdownHeadingSlug,
} from "@/lib/markdownHeadingSlug";

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return function Heading({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) {
    const text = flattenMarkdownChildren(children);
    const id = markdownHeadingSlug(text);
    return React.createElement(`h${level}`, { id, ...props }, children);
  };
}

const markdownComponents = {
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  h5: makeHeading(5),
  h6: makeHeading(6),
};

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
  React.useEffect(() => {
    if (!window.location.hash) return;
    const t = window.setTimeout(() => scrollToHash(window.location.hash), 0);
    return () => window.clearTimeout(t);
  }, [children]);

  React.useEffect(() => {
    const onHashChange = () => scrollToHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className={cn("markdown-body knowledge-article", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
