"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0b",
          color: "#fafafa",
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>My Daily Path — error</h1>
        <p style={{ margin: 0, opacity: 0.7, maxWidth: 420, fontSize: 14 }}>
          {error.message || "Unexpected error. Restart npm run dev if the app stays blank."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#6C63FF",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
