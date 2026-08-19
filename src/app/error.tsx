"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page failed to load. Try again, or restart the dev server if this keeps
        happening.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/calendar")}>
          Go to Calendar
        </Button>
      </div>
    </div>
  );
}
