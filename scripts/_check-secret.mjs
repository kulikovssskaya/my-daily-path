import fs from "node:fs";
for (const f of [".env.local", ".env.vercel.local", ".env.vercel.preview.local"]) {
  if (!fs.existsSync(f)) { console.log(f + ": not found"); continue; }
  const line = fs.readFileSync(f, "utf8").split(/\n/).find((l) => /^SYNC_SECRET=/.test(l));
  if (!line) { console.log(f + ": no SYNC_SECRET"); continue; }
  const v = line.replace(/^SYNC_SECRET=/, "").trim().replace(/^["']|["']$/g, "");
  console.log(f + " SYNC_SECRET length: " + v.length);
}
