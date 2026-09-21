import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";
import { AppError } from "../../../lib/errors";
import { buildCorrectionSegments } from "../../../lib/personal-correction";
import { NextRequest } from "next/server";

// tsx runs this suite as CommonJS. Replace only the server boundary before
// loading the real route; no Supabase, OpenRouter, or live student data is used.
const loadModule = createRequire(__filename);
let user: { id: string } | null = null;
let authError: { message: string } | null = null;
let adminCalls = 0;
const serverPath = loadModule.resolve("../../../lib/supabase/server");
loadModule(serverPath);
loadModule.cache[serverPath]!.exports = {
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
  }),
};
const adminPath = loadModule.resolve("../../../lib/supabase/admin");
loadModule(adminPath);
loadModule.cache[adminPath]!.exports = {
  createAdminClient: () => { adminCalls++; return {}; },
};
const ratePath = loadModule.resolve("../../../lib/services/checkAnswerRateLimit");
loadModule(ratePath);
let consume: (id: string) => Promise<boolean> = async () => true;
loadModule.cache[ratePath]!.exports = {
  consumeCheckAnswerRequest: async (_admin: unknown, id: string) => consume(id),
};
const { POST } = loadModule("./route") as typeof import("./route");

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENROUTER_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  user = null;
  authError = null;
  adminCalls = 0;
  consume = async () => true;
});

function allowAI() {
  process.env.OPENROUTER_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      corrected: "I am fine.", note: "Bien.",
    }) } }] });
  };
  return () => calls;
}

function request(body: unknown) {
  return new NextRequest("http://localhost:3004/api/check-answer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

test("invalid session returns 401 even if auth also supplies a user", async () => {
  user = { id: "untrusted-user" };
  authError = { message: "expired token" };
  const calls = allowAI();
  const response = await POST(request({ question: "How?", answer: "Fine" }));
  assert.equal(response.status, 401);
  assert.equal(calls(), 0);
  assert.equal(adminCalls, 0);
});

test("unauthenticated malformed JSON returns 401 before JSON parsing", async () => {
  const response = await POST(new NextRequest("http://localhost:3004/api/check-answer", {
    method: "POST", body: "{",
  }));
  assert.equal(response.status, 401);
});

test("authenticated malformed JSON returns 400 without consuming a slot", async () => {
  user = { id: "verified-user" };
  const response = await POST(new NextRequest("http://localhost:3004/api/check-answer", {
    method: "POST", body: "{",
  }));
  assert.equal(response.status, 400);
  assert.equal(adminCalls, 0);
});

test("exactly 500 answer characters are accepted without changing correction response shape", async () => {
  user = { id: "verified-user" };
  const calls = allowAI();
  const answer = "a".repeat(500);
  const response = await POST(request({ question: "How?", answer }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    corrections: buildCorrectionSegments(answer, "I am fine."), note: "Bien.",
  });
  assert.equal(calls(), 1);
});

test("rate-limit storage failure fails closed without calling AI", async (t) => {
  user = { id: "verified-user" };
  const calls = allowAI();
  t.mock.method(console, "error", () => {});
  consume = async () => { throw new AppError("Unavailable", "RATE_LIMIT_UNAVAILABLE"); };
  const response = await POST(request({ question: "How?", answer: "Fine" }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "No se pudo procesar tu respuesta. Intenta de nuevo.",
  });
  assert.equal(calls(), 0);
});

test("authenticated malformed, non-string and oversized answers return 400 before AI", async () => {
  user = { id: "verified-user" };
  const calls = allowAI();
  for (const body of [
    { question: "How are you?", answer: "a".repeat(501) },
    null, [], {}, { question: 7, answer: "Fine" },
    { question: "How?", answer: 7 }, { question: "How?", answer: "  " },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.equal(calls(), 0);
  assert.equal(adminCalls, 0);
});

test("11th authenticated POST is 429 and never calls AI, using only the session user", async () => {
  user = { id: "verified-user" };
  const calls = allowAI();
  let reservations = 0;
  consume = async (id) => {
    assert.equal(id, "verified-user");
    return ++reservations <= 10;
  };
  for (let i = 0; i < 11; i++) {
    const response = await POST(request({
      question: "How are you?", answer: "I am fine.", user_id: `forged-user-${i}`,
    }));
    assert.equal(response.status, i < 10 ? 200 : 429);
    if (i === 10) assert.deepEqual(await response.json(), {
      error: "Has intentado muchas veces. Intenta de nuevo más tarde.",
    });
  }
  assert.equal(calls(), 10);
});

test("unauthenticated POST returns friendly 401 without processing the body or calling AI", async () => {
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("Unexpected fetch"); };
  const response = await POST(request({ question: "How are you?", answer: "I am fine." }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Necesitas iniciar sesión." });
  assert.equal(fetchCalls, 0);
  assert.equal(adminCalls, 0);
});
