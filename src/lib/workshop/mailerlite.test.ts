import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "@/lib/errors";
import { registerWorkshopLead } from "./mailerlite";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("signup posts the subscriber into the env group with a level field", async () => {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (method === "POST" && url.endsWith("/subscribers")) {
      return jsonResponse(201, { data: { id: "sub" } });
    }
    return jsonResponse(500, {});
  };

  await registerWorkshopLead(
    { name: "Ana", email: "ana@example.com", level: "pre" },
    { fetch: fetchImpl, token: "test-token", groupId: "taller-escucha-id" },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/subscribers"), true);
  assert.deepEqual(calls[0].body, {
    email: "ana@example.com",
    fields: { name: "Ana", english_level: "Pre-Intermediate" },
    groups: ["taller-escucha-id"],
    status: "active",
  });
});

test("a failed subscribe does not retry group writes", async () => {
  const fetchImpl: typeof fetch = async () => jsonResponse(401, { message: "Unauthenticated." });
  await assert.rejects(
    () =>
      registerWorkshopLead(
        { name: "Ana", email: "ana@example.com", level: "int" },
        { fetch: fetchImpl, token: "bad", groupId: "taller-escucha-id" },
      ),
    (error: unknown) => error instanceof AppError && error.statusCode === 502,
  );
});
