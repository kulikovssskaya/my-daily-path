"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Printer,
  Eye,
  Pencil,
  Upload,
  FileType2,
} from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/Markdown";
import { cn } from "@/lib/utils";

function downloadMd(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printPdf(title: string, markdown: string) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  const escaped = markdown.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"
  );
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
    pre{white-space:pre-wrap;font-family:inherit;font-size:14px}
    @media print{body{margin:0}}
  </style></head><body><pre>${escaped}</pre>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  w.document.close();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CVManager() {
  const { cvs, addCV, addFileCV, updateCV, removeCV } = useCareerStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(cvs[0]?.id ?? null);
  const [mode, setMode] = React.useState<"edit" | "preview">("preview");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selected = cvs.find((c) => c.id === selectedId) ?? cvs[0] ?? null;
  React.useEffect(() => {
    if (!selected && cvs[0]) setSelectedId(cvs[0].id);
  }, [cvs, selected]);

  const createCV = () => {
    const label = window.prompt("CV version name:", "CV (EN)");
    if (!label) return;
    const lang = window.prompt("Language (English / ...):", "English") || "English";
    const id = addCV(label, lang);
    setSelectedId(id);
    setMode("edit");
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    // Data URLs live in localStorage (~5 MB budget), so keep files small.
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("File is too large (max ~4 MB). Please compress the PDF.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const label = file.name.replace(/\.[^.]+$/, "");
      const id = addFileCV({
        label,
        language: "—",
        fileName: file.name,
        fileType: file.type || "application/pdf",
        fileDataUrl: dataUrl,
      });
      setSelectedId(id);
    } catch {
      setUploadError("Could not read the file.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileText className="size-4" />
          </span>
          <CardTitle className="text-sm">CV versions</CardTitle>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.doc,.docx"
            className="hidden"
            onChange={onUploadFile}
          />
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Upload PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={createCV}>
            <Plus className="size-4" />
            New CV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs of CV versions */}
        <div className="flex flex-wrap gap-2">
          {cvs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                selected?.id === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
            >
              {c.fileDataUrl && <FileType2 className="mr-1 inline size-3" />}
              {c.label}
              <span className="ml-1 text-[10px] text-muted-foreground">
                {c.fileDataUrl ? "PDF" : c.language}
              </span>
            </button>
          ))}
        </div>

        {uploadError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {uploadError}
          </p>
        )}

        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={selected.label}
                onChange={(e) => updateCV(selected.id, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Label"
              />
              <input
                value={selected.targetRole ?? ""}
                onChange={(e) => updateCV(selected.id, { targetRole: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Target role"
              />
            </div>

            {selected.fileDataUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {selected.fileName}
                  </span>
                  <div className="flex gap-1">
                    <a href={selected.fileDataUrl} download={selected.fileName}>
                      <Button variant="ghost" size="sm">
                        <Download className="size-4" /> Download
                      </Button>
                    </a>
                    <a href={selected.fileDataUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4" /> Open
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCV(selected.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {selected.fileType?.includes("pdf") ? (
                  <iframe
                    src={selected.fileDataUrl}
                    title={selected.fileName}
                    className="h-[70vh] w-full rounded-lg border"
                  />
                ) : (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Preview is available for PDF files. Use “Download” or “Open” for this file
                    type.
                  </p>
                )}
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-lg border p-1">
                <button
                  onClick={() => setMode("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                    mode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  <Eye className="size-3.5" /> Preview
                </button>
                <button
                  onClick={() => setMode("edit")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                    mode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  <Pencil className="size-3.5" /> Markdown
                </button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadMd(`${selected.label}.md`, selected.markdown)}
                >
                  <Download className="size-4" /> .md
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => printPdf(selected.label, selected.markdown)}
                >
                  <Printer className="size-4" /> PDF
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCV(selected.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {mode === "edit" ? (
              <textarea
                value={selected.markdown}
                onChange={(e) => updateCV(selected.id, { markdown: e.target.value })}
                rows={16}
                className="w-full resize-y rounded-lg border bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <div className="rounded-lg border p-4">
                <Markdown>{selected.markdown}</Markdown>
              </div>
            )}
            </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Create your first CV.</p>
        )}
      </CardContent>
    </Card>
  );
}
