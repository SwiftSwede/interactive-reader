import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseCourseZoomUrl, ZOOM_URL_INVALID_MESSAGE } from "./zoom-url";

describe("parseCourseZoomUrl", () => {
  test("empty string stores null", () => {
    assert.deepEqual(parseCourseZoomUrl(""), { ok: true, value: null });
    assert.deepEqual(parseCourseZoomUrl("   "), { ok: true, value: null });
  });

  test("accepts https zoom.us and subdomains", () => {
    const root = parseCourseZoomUrl("https://zoom.us/j/123");
    assert.equal(root.ok, true);
    if (root.ok) assert.equal(root.value, "https://zoom.us/j/123");

    const sub = parseCourseZoomUrl(
      "https://us05web.zoom.us/j/123?pwd=abc"
    );
    assert.equal(sub.ok, true);
    if (sub.ok) {
      assert.ok(sub.value?.startsWith("https://us05web.zoom.us/"));
    }

    const com = parseCourseZoomUrl("https://zoom.com/j/123");
    assert.equal(com.ok, true);
  });

  test("rejects http, javascript, data, and non-Zoom hosts", () => {
    const cases = [
      "http://zoom.us/j/123",
      "javascript:alert(1)",
      "data:text/html,hi",
      "https://example.com/j/123",
      "https://zoom.us.attacker.com/j/123",
      "https://notzoom.us/j/123",
      "not a url",
    ];
    for (const raw of cases) {
      const result = parseCourseZoomUrl(raw);
      assert.deepEqual(result, {
        ok: false,
        error: ZOOM_URL_INVALID_MESSAGE,
      });
    }
  });
});
