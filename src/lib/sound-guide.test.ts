import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SOUND_VIDEO_CATALOG } from "./sound-catalog";
import {
  EXCLUDED_GUIDE_IDS,
  PLACEMENT_NOTES,
  SLOW_TAP_MS,
  SOUND_SECTIONS,
  audioSlug,
  buildSoundChart,
  guideTargets,
  ipaTokens,
  nextPlayback,
  sectionForIpa,
} from "./sound-guide";

describe("sound guide chart", () => {
  const chart = buildSoundChart();

  test("puts every catalog phoneme in exactly one section", () => {
    const placed = chart.cells.map((cell) => cell.symbol);
    assert.deepEqual(
      [...placed].sort(),
      SOUND_VIDEO_CATALOG.map((video) => video.symbol).sort()
    );
    const counts = new Map<string, number>();
    for (const cell of chart.cells) {
      counts.set(cell.ipa, (counts.get(cell.ipa) ?? 0) + 1);
    }
    for (const count of counts.values()) assert.equal(count, 1);
  });

  test("lists the process guide rows as excluded, not as cells", () => {
    const ids = new Set(chart.cells.map((cell) => cell.slug));
    for (const id of EXCLUDED_GUIDE_IDS) {
      assert.equal(ids.has(id), false);
      assert.equal(
        guideTargets().some((target) => target.id === id),
        true
      );
    }
    const d = chart.cells.find((cell) => cell.ipa === "d");
    assert.equal(d?.slug, "d");
    assert.equal(d?.coach, null);
  });

  test("joins r-colored and english r through aliases", () => {
    const er = chart.cells.find((cell) => cell.ipa === "ɝ");
    const r = chart.cells.find((cell) => cell.ipa === "ɹ");
    assert.equal(er?.slug, "vowel_r_colored_er");
    assert.equal(er?.coach?.nameEs, "Vocal con R (her, bird)");
    assert.equal(r?.slug, "consonant_r");
  });

  test("places juː and ʊɹ in vocales largas", () => {
    const long = chart.sections.find((section) => section.id === "long");
    assert.ok(long?.cells.some((cell) => cell.ipa === "juː"));
    assert.ok(long?.cells.some((cell) => cell.ipa === "ʊɹ"));
    assert.equal(sectionForIpa("juː")?.id, PLACEMENT_NOTES[0].sectionId);
    assert.equal(sectionForIpa("ʊɹ")?.id, PLACEMENT_NOTES[1].sectionId);
    assert.equal(
      chart.cells.find((cell) => cell.ipa === "juː")?.slug,
      "vowel_y_glide_initial"
    );
    assert.equal(chart.cells.find((cell) => cell.ipa === "ʊɹ")?.slug, "ure");
  });

  test("uses a guide id when joined and a fixed slug otherwise", () => {
    assert.equal(
      chart.cells.find((cell) => cell.ipa === "ɪ")?.slug,
      "vowel_short_i"
    );
    assert.equal(chart.cells.find((cell) => cell.ipa === "ɛ")?.slug, "short-e");
    assert.equal(chart.cells.find((cell) => cell.ipa === "ɑ")?.slug, "listerine");
    assert.equal(chart.cells.find((cell) => cell.ipa === "ʔ")?.slug, "consonant_glottal_stop");
    const slugs = chart.cells.map((cell) => cell.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  test("prefers the guide example as the keyword", () => {
    const shortI = chart.cells.find((cell) => cell.ipa === "ɪ");
    assert.equal(shortI?.keyword, "sit");
    assert.equal(shortI?.audioPath, "/audio/sounds/sit.mp3");
  });

  test("attaches a Spanish note to every cell", () => {
    const counts: Record<string, number> = { igual: 0, parecido: 0, unico: 0 };
    for (const cell of chart.cells) {
      assert.ok(cell.spanishNote, cell.slug);
      assert.ok(cell.spanishNote.noteEs.trim().length > 0);
      assert.ok(cell.spanishNote.relation in counts);
      counts[cell.spanishNote.relation] += 1;
    }
    assert.equal(chart.cells.length, 47);
    assert.deepEqual(counts, { igual: 8, parecido: 19, unico: 20 });
    assert.equal(
      chart.cells.find((cell) => cell.slug === "vowel_short_i")?.spanishNote
        ?.relation,
      "unico"
    );
  });

  test("keeps section order from the taxonomy", () => {
    assert.deepEqual(
      chart.sections.map((section) => section.id),
      SOUND_SECTIONS.map((section) => section.id)
    );
    const fricatives = chart.sections[0];
    assert.deepEqual(
      fricatives.cells.map((cell) => cell.ipa),
      ["f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h"]
    );
  });
});

describe("ipa tokens and audio slug", () => {
  test("splits multi-symbol guide ipa", () => {
    assert.deepEqual(ipaTokens("ɜr / ər"), ["ɜr", "ər"]);
    assert.deepEqual(ipaTokens("t, d, ɪd"), ["t", "d", "ɪd"]);
  });

  test("slugs words to lowercase letters and digits", () => {
    assert.equal(audioSlug("Luke"), "luke");
    assert.equal(audioSlug("Jess"), "jess");
    assert.equal(audioSlug("sit"), "sit");
  });
});

describe("slow tap window", () => {
  test("plays slow only for the same sound inside 1200ms", () => {
    assert.equal(nextPlayback(true, 0), "slow");
    assert.equal(nextPlayback(true, SLOW_TAP_MS), "slow");
    assert.equal(nextPlayback(true, SLOW_TAP_MS + 1), "normal");
    assert.equal(nextPlayback(false, 100), "normal");
  });
});
