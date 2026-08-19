import fs from "node:fs";
const line = fs.readFileSync(".env.vercel.local", "utf8").split(/\n/).find((l) => /^SYNC_SECRET=/.test(l));
if (!line) { console.log("no line"); process.exit(0); }
const raw = line.replace(/^SYNC_SECRET=/, "");
const trimmed = raw.trim();
const stripped = trimmed.replace(/^["']|["']$/g, "");
console.log("lineLength", line.length);
console.log("rawLength", raw.length);
console.log("trimmedLength", trimmed.length);
console.log("strippedLength", stripped.length);
console.log("startsWithQuote", /^["']/.test(trimmed));
console.log("endsWithQuote", /["']$/.test(trimmed));
console.log("hasCR", raw.includes("\r"));
