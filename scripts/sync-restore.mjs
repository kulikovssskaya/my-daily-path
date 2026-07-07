#!/usr/bin/env node
/** Upload local backup to Vercel cloud. Reads SYNC_SECRET from env or .env.vercel.local */
import fs from "node:fs";
import path from "node:path";

const API = process.env.SYNC_API_URL ?? "https://my-daily-path-ebon.vercel.app/api/sync";

function loadSecret() {
  if (process.env.SYNC_SECRET?.trim()) return process.env.SYNC_SECRET.trim();
  for (const file of [".env.vercel.local", ".env.local"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^SYNC_SECRET=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function findBackup() {
  const candidates = [
    path.join(process.cwd(), ".data", "sync-state.json"),
    path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Desktop", "my-daily-path-backup.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const secret = loadSecret();
if (!secret) {
  console.error("SYNC_SECRET not found. Run: npx vercel env pull .env.vercel.local");
  process.exit(1);
}

const backupPath = findBackup();
if (!backupPath) {
  console.error("No backup found (.data/sync-state.json or Desktop backup).");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(backupPath, "utf8"));
if (!payload.blobs) {
  console.error("Invalid backup file.");
  process.exit(1);
}

console.log(`Uploading ${backupPath} (${Object.keys(payload.blobs).length} stores)...`);

const res = await fetch(API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-sync-key": secret,
  },
  body: JSON.stringify({ blobs: payload.blobs }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Upload failed (${res.status}):`, body);
  process.exit(1);
}

const json = JSON.parse(body);
console.log("Cloud restored. updatedAt:", json.updatedAt);
console.log("Stores:", Object.keys(json.blobs ?? {}).join(", "));
