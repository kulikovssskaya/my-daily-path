"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const CalendarView = dynamic(
  () => import("@/components/schedule/CalendarView").then((m) => ({ default: m.CalendarView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        Loading calendar…
      </div>
    ),
  }
);

class CalendarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-medium text-destructive">Calendar failed to load</p>
          <p className="mt-2 text-muted-foreground">{this.state.error.message}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              try {
                localStorage.removeItem("mdp-schedule");
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Reset schedule data & reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function CalendarWorkspace() {
  return (
    <div className="mx-auto max-w-6xl">
      <CalendarErrorBoundary>
        <CalendarView />
      </CalendarErrorBoundary>
    </div>
  );
}
