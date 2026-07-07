#!/usr/bin/env node
/** Copy KV_* + SYNC_SECRET from .env.vercel.local → .env.local (for same cloud on dev + Vercel). */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, ".env.vercel.local");
const targetPath = path.join(root, ".env.local");

const KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "SYNC_SECRET",
];

function parseEnv(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out.set(trimmed.slice(0, eq), val);
  }
  return out;
}

function isEmpty(val) {
  return val == null || String(val).trim() === "";
}

if (!fs.existsSync(sourcePath)) {
  console.error("Missing .env.vercel.local — run: npx vercel env pull .env.vercel.local");
  process.exit(1);
}

const source = parseEnv(fs.readFileSync(sourcePath, "utf8"));
const existing = fs.existsSync(targetPath)
  ? parseEnv(fs.readFileSync(targetPath, "utf8"))
  : new Map();

let updated = 0;
for (const key of KEYS) {
  const val = source.get(key);
  if (isEmpty(val)) continue;
  if (existing.get(key) === val) continue;
  existing.set(key, val);
  updated += 1;
}

const lines = [...existing.entries()].map(([k, v]) => `${k}=${v}`);
fs.writeFileSync(targetPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Updated ${targetPath} (${updated} sync key(s) written)`);
if (updated > 0) {
  console.log("Restart dev server so PC Up uses the same Redis as Vercel.");
}
