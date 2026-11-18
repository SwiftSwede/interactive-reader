import assert from "node:assert/strict";
import { test } from "node:test";
import { triggerOrigin } from "./trigger-origin";

test("origin is the trigger center, even when that point is outside the layer", () => {
  const origin = triggerOrigin(
    { left: 10, top: 20, width: 20, height: 10 },
    { left: 100, top: 80, width: 200, height: 120 },
  );
  assert.equal(origin.x, -80);
  assert.equal(origin.y, -55);
});
