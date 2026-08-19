import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">This route does not exist.</p>
      <Link
        href="/calendar"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back to Calendar
      </Link>
    </div>
  );
}
