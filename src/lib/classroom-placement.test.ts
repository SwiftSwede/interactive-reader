import assert from "node:assert/strict";
import { test } from "node:test";

import { isLiveStripeManaged } from "./classroom-placement";

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
