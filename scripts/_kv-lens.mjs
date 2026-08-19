import fs from "node:fs";
function lenKey(file, key) {
  const line = fs.readFileSync(file, "utf8").split(/\n/).find((l) => l.startsWith(key + "="));
  if (!line) return -1;
  const v = line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  return v.length;
}
for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
  console.log(k + " length: " + lenKey(".env.vercel.local", k));
}
