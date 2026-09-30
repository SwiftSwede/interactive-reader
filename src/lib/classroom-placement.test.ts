import assert from "node:assert/strict";
import { test } from "node:test";

import {
  futureLiveCourseIdsToDrop,
  isLiveStripeManaged,
} from "./classroom-placement";

test("cancelled Stripe leftover does not block Quitar", () => {
  assert.equal(isLiveStripeManaged(["cancelled"]), false);
  assert.equal(isLiveStripeManaged([]), false);
  assert.equal(isLiveStripeManaged([null]), false);
});

test("active or paused Stripe sub still blocks Quitar", () => {
  assert.equal(isLiveStripeManaged(["active"]), true);
  assert.equal(isLiveStripeManaged(["paused"]), true);
  assert.equal(isLiveStripeManaged(["cancelled", "active"]), true);
});

test("Quitar keeps a month that already started", () => {
  assert.deepEqual(
    futureLiveCourseIdsToDrop(
      [
        { courseId: "sept", archived: true },
        { courseId: "oct", archived: false },
      ],
      [
        { courseId: "sept", sessionStartTime: "2026-09-01T18:00:00.000Z" },
        { courseId: "oct", sessionStartTime: "2026-10-06T18:00:00.000Z" },
      ],
      new Date("2026-09-30T18:00:00.000Z")
    ),
    ["oct"]
  );
});

test("Quitar keeps the live month once class has begun", () => {
  assert.deepEqual(
    futureLiveCourseIdsToDrop(
      [{ courseId: "sept", archived: false }],
      [{ courseId: "sept", sessionStartTime: "2026-09-01T18:00:00.000Z" }],
      new Date("2026-09-30T18:00:00.000Z")
    ),
    []
  );
});
