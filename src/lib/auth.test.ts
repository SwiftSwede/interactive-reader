import assert from "node:assert/strict";
import { test } from "node:test";

import { authConfirmRedirectTo, resolveAuthNext, safeNextPath } from "./auth";

test("safeNextPath keeps lesson session URLs", () => {
  assert.equal(
    safeNextPath("/lesson/flustered-and-driving?session=abc"),
    "/lesson/flustered-and-driving?session=abc"
  );
});

test("safeNextPath rejects off-site URLs", () => {
  assert.equal(safeNextPath("https://evil.example/phish"), "/dashboard");
  assert.equal(safeNextPath("//evil.example"), "/dashboard");
});

test("resolveAuthNext unwraps confirm RedirectTo", () => {
  const next = resolveAuthNext(
    "https://learn.profekyle.com/auth/confirm?next=%2Flesson%2Ffoo%3Fsession%3Dtok",
    "https://learn.profekyle.com"
  );
  assert.equal(next, "/lesson/foo?session=tok");
});

test("resolveAuthNext rejects a different origin", () => {
  assert.equal(
    resolveAuthNext("https://evil.example/auth/confirm?next=/lesson/foo", "https://learn.profekyle.com"),
    "/dashboard"
  );
});

test("resolveAuthNext ignores absolute URLs without an allowed origin", () => {
  assert.equal(
    resolveAuthNext("https://learn.profekyle.com/lesson/foo"),
    "/dashboard"
  );
});

test("authConfirmRedirectTo encodes the class path", () => {
  assert.equal(
    authConfirmRedirectTo("https://learn.profekyle.com", "/lesson/foo?session=tok"),
    "https://learn.profekyle.com/auth/confirm?next=%2Flesson%2Ffoo%3Fsession%3Dtok"
  );
});
