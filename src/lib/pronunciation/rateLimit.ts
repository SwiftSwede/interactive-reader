import { createHash } from "node:crypto";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS = 10;

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export function hashRateLimitKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function allowAssessment(keys: string[]): boolean {
  const now = Date.now();
  for (const key of keys) {
    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((time) => now - time < WINDOW_MS);
    if (bucket.timestamps.length >= MAX_REQUESTS) {
      buckets.set(key, bucket);
      return false;
    }
  }

  for (const key of keys) {
    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps.push(now);
    buckets.set(key, bucket);
  }
  return true;
}
