import assert from "node:assert/strict";
import { test } from "node:test";
import { levelTag, workshopLevels } from "./levels";

test("each dropdown level maps to one tag", () => {
  assert.deepEqual(
    workshopLevels.map((level) => [level.id, levelTag(level.id)]),
    [
      ["beginner", "lvl-beginner"],
      ["pre", "lvl-pre"],
      ["int", "lvl-int"],
      ["adv", "lvl-adv"],
    ],
  );
});
