import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EVALUACION_BANK_V1 } from "./evaluacion-bank-v1";
import { optionId, toRows, validateBank } from "../src/lib/evaluacion/seed";

describe("evaluación bank v1", () => {
  test("passes every item rule", () => {
    assert.deepEqual(validateBank(EVALUACION_BANK_V1), []);
  });

  test("has 60 placement structures, split by EGP level rather than 15 per track", () => {
    const counts: Record<string, number> = {};
    for (const structure of EVALUACION_BANK_V1) {
      counts[structure.track] = (counts[structure.track] ?? 0) + 1;
    }
    assert.equal(EVALUACION_BANK_V1.length, 60);
    assert.deepEqual(counts, { beginner: 15, pre_int: 17, int: 14, upper: 14 });
  });

  test("rows carry opaque option ids with the key among them", () => {
    const { structures, items } = toRows(EVALUACION_BANK_V1);
    assert.equal(structures.length, 60);
    assert.equal(items.length, 120);
    for (const item of items) {
      assert.equal(item.options.length, 4);
      assert.ok(item.options.some((option) => option.id === item.correct_option_id));
      assert.match(item.correct_option_id, /^o[0-9a-f]{8}$/);
    }
    assert.equal(optionId("x.p1", "same"), optionId("x.p1", "same"));
    assert.notEqual(optionId("x.p1", "same"), optionId("y.p1", "same"));
  });

  test("positions restart at 1 in each track", () => {
    const { structures } = toRows(EVALUACION_BANK_V1);
    const firsts = structures.filter((structure) => structure.position === 1).map((s) => s.track);
    assert.deepEqual(firsts.sort(), ["beginner", "int", "pre_int", "upper"]);
  });
});
