import assert from "node:assert/strict";
import { test } from "node:test";
import { googleCalendarUrl, workshopIcs, workshopInstants } from "./calendar";

test("the workshop is 17:30 Mexico City for 45 minutes", () => {
  const { startStamp, endStamp } = workshopInstants();
  assert.equal(startStamp, "20261028T233000Z");
  assert.equal(endStamp, "20261029T001500Z");
});

test("the calendar file and Google link use those instants", () => {
  const ics = workshopIcs();
  assert.match(ics, /DTSTART:20261028T233000Z/);
  assert.match(ics, /DTEND:20261029T001500Z/);
  const url = new URL(googleCalendarUrl());
  assert.equal(url.searchParams.get("dates"), "20261028T233000Z/20261029T001500Z");
});
