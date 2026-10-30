import { createHash, createHmac, randomBytes } from "node:crypto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 32 random bytes, base64url. Only its sha256 is stored (ADR 017). */
export function newGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isGuestToken(value: string | undefined | null): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Keyed so the IPv4 space can't be brute-forced back out of the table. */
export function hashIp(ip: string, key: string): string {
  return createHmac("sha256", key).update(`eval-ip:${ip}`).digest("hex").slice(0, 32);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
