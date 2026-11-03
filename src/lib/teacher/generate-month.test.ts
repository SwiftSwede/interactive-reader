import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { coursesToArchive } from "./generate-month";

describe("coursesToArchive", () => {
  test("archives only earlier months in this horario, not a same-month sibling", () => {
    const ids = coursesToArchive(
      [
        { id: "sep", monthKey: "2026-09", cohort: "main" },
        { id: "oct-a", monthKey: "2026-10", cohort: "main" },
        { id: "oct-new", monthKey: "2026-10", cohort: "main" },
      ],
      "2026-10",
      "oct-new",
      "main"
    );
    assert.deepEqual(ids, ["sep"]);
  });

  test("creating the other horario does not archive the usual one", () => {
    const ids = coursesToArchive(
      [
        { id: "oct-main", monthKey: "2026-10", cohort: "main" },
        { id: "oct-extra", monthKey: "2026-10", cohort: "extra" },
      ],
      "2026-11",
      "nov-extra",
      "extra"
    );
    assert.deepEqual(ids, ["oct-extra"]);
  });
});
