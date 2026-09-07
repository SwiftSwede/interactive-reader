import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isAutoMarked } from "./attendance";

describe("isAutoMarked", () => {
  const start = "2026-09-07T19:00:00.000Z";
  const end = "2026-09-07T20:30:00.000Z";

  test("true when first opened inside the window", () => {
    assert.equal(
      isAutoMarked("2026-09-07T19:15:00.000Z", start, end),
      true
    );
  });

  test("false when the student never opened", () => {
    assert.equal(isAutoMarked(null, start, end), false);
  });

  test("false when first opened after the window", () => {
    assert.equal(
      isAutoMarked("2026-09-07T21:00:00.000Z", start, end),
      false
    );
  });
});
