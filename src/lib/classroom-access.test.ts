import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  alumniMayAccessSession,
  periodCoversSessionStart,
} from "./classroom-access";

describe("periodCoversSessionStart", () => {
  test("includes a class inside the paid window", () => {
    assert.equal(
      periodCoversSessionStart("2026-09-15T18:00:00.000Z", [
        {
          startedAt: "2026-09-01T00:00:00.000Z",
          endedAt: "2026-09-30T23:59:59.000Z",
        },
      ]),
      true
    );
  });

  test("blocks a class after paid-through", () => {
    assert.equal(
      periodCoversSessionStart("2026-10-06T18:00:00.000Z", [
        {
          startedAt: "2026-09-01T00:00:00.000Z",
          endedAt: "2026-09-30T23:59:59.000Z",
        },
      ]),
      false
    );
  });
});

describe("alumniMayAccessSession", () => {
  test("PayPal alumni with no Stripe periods keep an enrolled month", () => {
    assert.equal(
      alumniMayAccessSession({
        enrolledInCourse: true,
        sessionStartTime: "2026-09-15T18:00:00.000Z",
        periods: [],
      }),
      true
    );
  });

  test("alumni without enrollment or a paid window cannot open a new month", () => {
    assert.equal(
      alumniMayAccessSession({
        enrolledInCourse: false,
        sessionStartTime: "2026-10-06T18:00:00.000Z",
        periods: [],
      }),
      false
    );
  });

  test("Stripe alumni without enrollment still open a paid-window class", () => {
    assert.equal(
      alumniMayAccessSession({
        enrolledInCourse: false,
        sessionStartTime: "2026-09-15T18:00:00.000Z",
        periods: [
          {
            startedAt: "2026-09-01T00:00:00.000Z",
            endedAt: "2026-09-30T23:59:59.000Z",
          },
        ],
      }),
      true
    );
  });
});
