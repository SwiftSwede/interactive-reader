import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  markWelcomeSeen,
  readWelcomeSeen,
  WELCOME_SEEN_KEY,
} from "./welcome-seen";

describe("readWelcomeSeen", () => {
  test("treats missing storage as seen", () => {
    assert.equal(readWelcomeSeen(null), true);
  });

  test("is unseen until the flag is written", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    assert.equal(readWelcomeSeen(storage), false);
    markWelcomeSeen(storage);
    assert.equal(store.get(WELCOME_SEEN_KEY), "1");
    assert.equal(readWelcomeSeen(storage), true);
  });

  test("fails open when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(readWelcomeSeen(storage), true);
  });
});