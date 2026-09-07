import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseSessionYoutubeUrl,
  YOUTUBE_URL_INVALID_MESSAGE,
} from "./youtube-url";

describe("parseSessionYoutubeUrl", () => {
  test("empty string stores null", () => {
    assert.deepEqual(parseSessionYoutubeUrl(""), { ok: true, value: null });
    assert.deepEqual(parseSessionYoutubeUrl("   "), { ok: true, value: null });
  });

  test("accepts https youtube.com and youtu.be", () => {
    const watch = parseSessionYoutubeUrl(
      "https://www.youtube.com/watch?v=abc123"
    );
    assert.equal(watch.ok, true);
    if (watch.ok) {
      assert.equal(watch.value, "https://www.youtube.com/watch?v=abc123");
    }

    const short = parseSessionYoutubeUrl("https://youtu.be/abc123");
    assert.equal(short.ok, true);
    if (short.ok) assert.equal(short.value, "https://youtu.be/abc123");

    const mobile = parseSessionYoutubeUrl(
      "https://m.youtube.com/watch?v=abc123"
    );
    assert.equal(mobile.ok, true);
  });

  test("rejects http, javascript, data, and non-YouTube hosts", () => {
    const cases = [
      "http://www.youtube.com/watch?v=abc",
      "javascript:alert(1)",
      "data:text/html,hi",
      "https://example.com/watch?v=abc",
      "https://youtube.com.attacker.com/watch?v=abc",
      "https://notyoutube.com/watch?v=abc",
      "not a url",
    ];
    for (const raw of cases) {
      const result = parseSessionYoutubeUrl(raw);
      assert.deepEqual(result, {
        ok: false,
        error: YOUTUBE_URL_INVALID_MESSAGE,
      });
    }
  });
});
