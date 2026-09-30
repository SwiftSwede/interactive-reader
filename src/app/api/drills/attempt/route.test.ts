import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";
import { AppError } from "../../../../lib/errors";

// Replace only the server boundary before loading the real route. No
// Supabase or live student data is used.
const loadModule = createRequire(__filename);
let user: { id: string } | null = null;
let role: "student" | "teacher" | null = "student";
let submitted: unknown[] = [];
let outcome: () => Promise<unknown> = async () => ({
  correct: true,
  graduated: false,
  collectionCount: 1,
});

function stub(relative: string, exports: Record<string, unknown>) {
  const resolved = loadModule.resolve(relative);
  loadModule(resolved);
  loadModule.cache[resolved]!.exports = exports;
}

stub("../../../../lib/supabase/server", {
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
  }),
});
stub("../../../../lib/supabase/admin", { createAdminClient: () => ({}) });
stub("../../../../lib/auth-server", {
  getProfile: async () => (role ? { role } : null),
});
stub("../../../../lib/drill-attempt", {
  submitDrillAttempt: async (input: unknown) => {
    submitted.push(input);
    return outcome();
  },
});
const { POST } = loadModule("./route") as typeof import("./route");

afterEach(() => {
  user = null;
  role = "student";
  submitted = [];
  outcome = async () => ({ correct: true, graduated: false, collectionCount: 1 });
});

const ITEM_ID = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("http://localhost:3004/api/drills/attempt", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

test("no session is 401 and nothing is submitted", async () => {
  const response = await POST(request({ itemId: ITEM_ID, answer: "do" }));
  assert.equal(response.status, 401);
  assert.equal(submitted.length, 0);
});

test("teacher preview does not write", async () => {
  user = { id: "teacher-1" };
  role = "teacher";
  const response = await POST(request({ itemId: ITEM_ID, answer: "do" }));
  assert.equal(response.status, 403);
  assert.equal(submitted.length, 0);
});

test("a bad body is 400", async () => {
  user = { id: "student-1" };
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request({ itemId: "nope", answer: "do" }))).status, 400);
  assert.equal(
    (await POST(request({ itemId: ITEM_ID, answer: "x".repeat(501) }))).status,
    400,
  );
  assert.equal(submitted.length, 0);
});

test("the session user id is used, never one from the body", async () => {
  user = { id: "student-1" };
  const response = await POST(
    request({ itemId: ITEM_ID, answer: "do", userId: "someone-else" }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    correct: true,
    graduated: false,
    collectionCount: 1,
  });
  assert.equal((submitted[0] as { userId: string }).userId, "student-1");
});

test("an expected failure keeps its status", async () => {
  user = { id: "student-1" };
  outcome = async () => {
    throw new AppError("Esa tarjeta no lleva respuesta.", "DRILL_NOT_ANSWERABLE", 422);
  };
  const response = await POST(request({ itemId: ITEM_ID, answer: "x" }));
  assert.equal(response.status, 422);
});

test("an unexpected failure is a friendly 500", async () => {
  user = { id: "student-1" };
  outcome = async () => {
    throw new Error("db down");
  };
  const response = await POST(request({ itemId: ITEM_ID, answer: "x" }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Algo salió mal. Intenta de nuevo." });
});
