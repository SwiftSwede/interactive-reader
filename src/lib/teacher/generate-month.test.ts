import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { coursesToArchive } from "./generate-month";

describe("coursesToArchive", () => {
  test("archives only earlier months at this level, not a same-month sibling", () => {
    const ids = coursesToArchive(
      [
        { id: "sep", monthKey: "2026-09" },
        { id: "oct-a", monthKey: "2026-10" },
        { id: "oct-new", monthKey: "2026-10" },
      ],
      "2026-10",
      "oct-new"
    );
    assert.deepEqual(ids, ["sep"]);
  });

  test("archives both prior groups when two ran last month", () => {
    const ids = coursesToArchive(
      [
        { id: "oct-a", monthKey: "2026-10" },
        { id: "oct-b", monthKey: "2026-10" },
      ],
      "2026-11",
      "nov"
    );
    assert.deepEqual(ids, ["oct-a", "oct-b"]);
  });
});
