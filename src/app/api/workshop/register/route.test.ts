import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";

const loadModule = createRequire(__filename);
const leads: unknown[] = [];
let fail: Error | null = null;

function stub(relative: string, exports: Record<string, unknown>) {
  const resolved = loadModule.resolve(relative);
  loadModule(resolved);
  loadModule.cache[resolved]!.exports = exports;
}

stub("../../../../lib/workshop/mailerlite", {
  registerWorkshopLead: async (lead: unknown) => {
    if (fail) throw fail;
    leads.push(lead);
  },
});

const { POST } = loadModule("./route") as typeof import("./route");

const originalToken = process.env.MAILERLITE_API_TOKEN;
const originalGroup = process.env.MAILERLITE_GROUP_ID;

afterEach(() => {
  leads.length = 0;
  fail = null;
  if (originalToken === undefined) delete process.env.MAILERLITE_API_TOKEN;
  else process.env.MAILERLITE_API_TOKEN = originalToken;
  if (originalGroup === undefined) delete process.env.MAILERLITE_GROUP_ID;
  else process.env.MAILERLITE_GROUP_ID = originalGroup;
});

function readyEnv() {
  process.env.MAILERLITE_API_TOKEN = "token";
  process.env.MAILERLITE_GROUP_ID = "taller-escucha-id";
}

function request(body: unknown) {
  return new Request("http://localhost:3004/api/workshop/register", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const valid = {
  name: "Ana",
  email: "ana@example.com",
  level: "pre",
};

test("a bad body is 400 and nothing is registered", async () => {
  readyEnv();
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request({ ...valid, email: "nope" }))).status, 400);
  assert.equal((await POST(request({ ...valid, level: "lvl-pre" }))).status, 400);
  assert.equal(leads.length, 0);
});

test("a honeypot submission looks successful and is not registered", async () => {
  readyEnv();
  const response = await POST(request({ ...valid, website: "https://spam.test" }));
  assert.equal(response.status, 200);
  assert.equal(leads.length, 0);
});

test("a missing token is 503", async () => {
  delete process.env.MAILERLITE_API_TOKEN;
  process.env.MAILERLITE_GROUP_ID = "taller-escucha-id";
  const response = await POST(request(valid));
  assert.equal(response.status, 503);
  assert.equal(leads.length, 0);
});

test("a missing group id is 503", async () => {
  process.env.MAILERLITE_API_TOKEN = "token";
  delete process.env.MAILERLITE_GROUP_ID;
  const response = await POST(request(valid));
  assert.equal(response.status, 503);
  assert.equal(leads.length, 0);
});

test("a valid signup is registered and returns ok", async () => {
  readyEnv();
  const response = await POST(request(valid));
  assert.equal(response.status, 200);
  assert.deepEqual(leads, [{ name: "Ana", email: "ana@example.com", level: "pre" }]);
});

function formRequest(fields: Record<string, string>) {
  return new Request("http://localhost:3004/api/workshop/register", {
    method: "POST",
    body: new URLSearchParams(fields),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

test("a native form post redirects to thanks", async () => {
  readyEnv();
  const response = await POST(formRequest(valid));
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get("location") ?? "").pathname, "/workshop/gracias");
  assert.deepEqual(leads, [{ name: "Ana", email: "ana@example.com", level: "pre" }]);
});

test("a native form post with bad data redirects back to the lander", async () => {
  readyEnv();
  const response = await POST(formRequest({ ...valid, email: "nope" }));
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/workshop");
  assert.equal(location.searchParams.get("aviso"), "datos");
  assert.equal(leads.length, 0);
});
