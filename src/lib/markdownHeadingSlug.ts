/** Slug for knowledge-base heading anchors (matches TOC links in markdown). */
export function markdownHeadingSlug(text: string): string {
  let t = text.trim();

  t = t.replace(/\s*\(([^)]+)\)/g, (_, inner: string) => {
    const normalized = inner
      .toLowerCase()
      .replace(/\s*\/\s*/g, "--")
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "-");
    return normalized ? ` ${normalized}` : "";
  });

  return t
    .toLowerCase()
    .replace(/\//g, "")
    .replace(/[^a-zа-яё0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function flattenMarkdownChildren(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenMarkdownChildren).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return flattenMarkdownChildren(props?.children);
  }
  return "";
}
