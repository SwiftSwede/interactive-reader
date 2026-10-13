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

test("signup creates a missing group and posts the subscriber once", async () => {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (method === "GET" && url.includes("filter%5Bname%5D=taller-escucha-2026-10")) {
      return jsonResponse(200, {
        data: [
          { id: "partial", name: "taller-escucha-2026-10-old" },
          { id: "cycle", name: "taller-escucha-2026-10" },
        ],
      });
    }
    if (method === "GET" && url.includes("src-web")) {
      return jsonResponse(200, { data: [{ id: "src", name: "src-web" }] });
    }
    if (method === "GET" && url.includes("lvl-pre")) {
      return jsonResponse(200, { data: [] });
    }
    if (method === "POST" && url.endsWith("/groups")) {
      assert.equal(body.name, "lvl-pre");
      return jsonResponse(201, { data: { id: "level", name: "lvl-pre" } });
    }
    if (method === "POST" && url.endsWith("/subscribers")) {
      return jsonResponse(201, { data: { id: "sub" } });
    }
    return jsonResponse(500, {});
  };

  await registerWorkshopLead(
    { name: "Ana", email: "ana@example.com", level: "pre" },
    { fetch: fetchImpl, token: "test-token" },
  );

  const subscribe = calls.find((call) => call.url.endsWith("/subscribers"));
  assert.ok(subscribe);
  assert.deepEqual(subscribe.body, {
    email: "ana@example.com",
    fields: { name: "Ana" },
    groups: ["cycle", "src", "level"],
    status: "active",
  });
  assert.equal(
    calls.filter((call) => call.method === "POST" && call.url.endsWith("/groups")).length,
    1,
  );
});

test("a failed group lookup does not subscribe", async () => {
  const fetchImpl: typeof fetch = async () => jsonResponse(401, { message: "Unauthenticated." });
  await assert.rejects(
    () =>
      registerWorkshopLead(
        { name: "Ana", email: "ana@example.com", level: "int" },
        { fetch: fetchImpl, token: "bad" },
      ),
    (error: unknown) => error instanceof AppError && error.statusCode === 502,
  );
});
