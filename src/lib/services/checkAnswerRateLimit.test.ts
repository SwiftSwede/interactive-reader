import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeCheckAnswerRequest } from "./checkAnswerRateLimit";

function client(data: unknown, error: unknown = null) {
  return {
    rpc: async (name: string, args: { p_user_id: string }) => {
      assert.equal(name, "consume_check_answer_request");
      assert.deepEqual(args, { p_user_id: "verified-user" });
      return { data, error };
    },
  } as unknown as SupabaseClient;
}

test("reserves a check-answer slot through the atomic RPC using the verified user", async () => {
  assert.equal(await consumeCheckAnswerRequest(client(true), "verified-user"), true);
});

test("returns false when the database denies a slot", async () => {
  assert.equal(await consumeCheckAnswerRequest(client(false), "verified-user"), false);
});

test("fails closed with a typed error on database errors or unexpected results", async () => {
  for (const db of [client(true, { message: "database failed" }), client(null), client("true")]) {
    await assert.rejects(consumeCheckAnswerRequest(db, "verified-user"), {
      code: "RATE_LIMIT_UNAVAILABLE",
      statusCode: 500,
    });
  }
});
