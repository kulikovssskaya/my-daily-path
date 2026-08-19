import fs from "node:fs";
function readSecretRaw() {
  for (const file of [".env.vercel.local", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    const line = fs.readFileSync(file, "utf8").split(/\n/).find((l) => /^SYNC_SECRET=/.test(l));
    if (!line) continue;
    return { file, raw: line.replace(/^SYNC_SECRET=/, "") };
  }
  return null;
}
function stripLikeServer(s) {
  return s.trim().replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "");
}
const hit = readSecretRaw();
if (!hit) {
  console.log("SYNC_SECRET not found");
  process.exit(1);
}
const trimmed = hit.raw.trim();
const stripped = stripLikeServer(hit.raw);
console.log("file:", hit.file);
console.log("raw startsWithQuote:", /^["']/.test(trimmed));
console.log("raw endsWithQuote:", /["']$/.test(trimmed));
console.log("stripped length:", stripped.length);
console.log("stripped first char code:", stripped.length ? stripped.codePointAt(0) : null);
console.log("stripped last char code:", stripped.length ? stripped.codePointAt(stripped.length - 1) : null);
console.log("server verifySyncRequest strips outer quotes on SYNC_SECRET and x-sync-key");
