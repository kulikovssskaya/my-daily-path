import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Consistent header + scrollable content region for each tab. */
export function PageShell({
  title,
  description,
  icon,
  children,
  className,
}: PageShellProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin px-4 py-5 pb-8 sm:px-6",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
