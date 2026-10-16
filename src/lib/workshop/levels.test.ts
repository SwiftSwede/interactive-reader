import assert from "node:assert/strict";
import { test } from "node:test";
import { levelTag, workshopLevels } from "./levels";

test("each dropdown level maps to one tag", () => {
  assert.deepEqual(
    workshopLevels.map((level) => [level.id, levelTag(level.id)]),
    [
      ["beginner", "Principiante"],
      ["pre", "Pre-Intermediate"],
      ["int", "Intermediate"],
      ["adv", "Advanced"],
    ],
  );
});
