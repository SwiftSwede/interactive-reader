// Placement + IPA alignment check for any seeded song.
// Runs the REAL placeLyricBlanks + indexedLyricLines from src/lib/music against
// the SONGS entry in seed-music.ts. Catches silent blank-placement failures
// (wrong prompt encoding, unplaceable entries, double-claims) BEFORE seeding.
//
// Usage:
//   npx tsx scripts/check-song-placement.ts --slug white-is-red
//   npx tsx scripts/check-song-placement.ts               # all songs
//
// Invariants verified per song:
//   1. Every blank entry, run alone against the body, places at least once.
//      (An entry that matches zero lines is a silent worksheet hole.)
//   2. Sum of per-entry placements == placements of the full array together.
//      (Together, placeLyricBlanks dedupes by position; a sum mismatch means
//      two entries are fighting over the same spot — an encoding smell.)
//   3. IPA line_index values are in range and not duplicated.
// A single entry matching MULTIPLE identical lines is legitimate (deck numbers
// the same blank at every occurrence) — reported for eyeball, not an error.
//
// Exits 1 on any failure. Prints placements + a lyrics||IPA side-by-side.
import { placeLyricBlanks, indexedLyricLines, LyricBlank } from "../src/lib/music";
import { SONGS } from "./seed-music";

const slugIdx = process.argv.indexOf("--slug");
const slugArg = slugIdx >= 0 ? process.argv[slugIdx + 1] : null;
const songs = slugArg ? SONGS.filter((s) => s.slug === slugArg) : SONGS;

if (songs.length === 0) {
  console.error(`No song with slug "${slugArg}" in SONGS.`);
  process.exit(1);
}

let anyFail = false;

function countPlacements(
  body: string,
  blanks: LyricBlank[]
): { total: number; perLine: string[] } {
  const lines = indexedLyricLines(body);
  const placed = placeLyricBlanks(body, blanks);
  const perLine: string[] = [];
  let total = 0;
  for (const line of placed) {
    if (line.lineIndex === null) continue;
    const idx = line.lineIndex;
    for (const seg of line.segments) {
      if (seg.kind === "blank") {
        total += 1;
        perLine.push(
          `  line ${idx} [${lines[idx]}] -> blank ${seg.blankId} (${seg.answer})`
        );
      }
    }
  }
  return { total, perLine };
}

for (const song of songs) {
  console.log(`\n=== ${song.slug} (${song.title}) ===`);
  const lines = indexedLyricLines(song.body);
  console.log(`Non-empty lines: ${lines.length}`);

  // --- IPA range + duplicates ---
  const ipa = song.lyricsIpa ?? [];
  if (ipa.length !== lines.length) {
    console.log(
      `  WARNING: IPA count ${ipa.length} != line count ${lines.length} (draft IPA is allowed; lines without IPA render clean)`
    );
  }
  const ipaByIndex = new Map<number, string>();
  for (const row of ipa) {
    if (row.line_index > lines.length - 1) {
      anyFail = true;
      console.log(
        `  FAIL: IPA line_index ${row.line_index} out of range (max ${lines.length - 1})`
      );
    }
    if (ipaByIndex.has(row.line_index)) {
      anyFail = true;
      console.log(`  FAIL: IPA line_index ${row.line_index} duplicated`);
    }
    ipaByIndex.set(row.line_index, row.ipa_text);
  }

  // --- Per-entry placement (invariant 1) + sum (invariant 2) ---
  let sumSingles = 0;
  song.lyricBlanks.forEach((blank, i) => {
    const single = countPlacements(song.body, [blank]);
    sumSingles += single.total;
    if (single.total === 0) {
      anyFail = true;
      console.log(
        `  FAIL: entry #${i + 1} (id ${blank.id}, "${blank.prompt}") matches no line`
      );
    }
  });

  const full = countPlacements(song.body, song.lyricBlanks);
  if (sumSingles !== full.total) {
    anyFail = true;
    console.log(
      `  FAIL: per-entry placements sum to ${sumSingles} but full array places ${full.total} (two entries claim the same spot)`
    );
  }

  console.log(`\nPlacements together (${full.total}):`);
  full.perLine.forEach((d) => console.log(d));

  // Per-id totals for deck eyeball
  const perId = new Map<number, number>();
  for (const d of full.perLine) {
    const m = d.match(/blank (\d+)/);
    if (m) perId.set(Number(m[1]), (perId.get(Number(m[1])) ?? 0) + 1);
  }
  console.log("Per-id placements (compare with the deck's numbering):");
  const ids = [...perId.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const entries = song.lyricBlanks.filter((b) => b.id === id).length;
    const note =
      perId.get(id)! > entries
        ? " (one entry matched multiple identical lines — OK)"
        : "";
    console.log(`  blank ${id}: ${perId.get(id)} placement(s), ${entries} entry(ies)${note}`);
  }

  // --- Side-by-side lyrics || IPA ---
  if (ipa.length > 0) {
    console.log("\nLyrics || IPA (eyeball the alignment):");
    lines.forEach((line, i) => {
      const ipaText = ipaByIndex.get(i) ?? "(no IPA)";
      console.log(`  ${String(i).padStart(2)} ${line}  ||  ${ipaText}`);
    });
  }
}

console.log(anyFail ? "\nCHECKS FAILED" : "\nALL CHECKS PASSED");
process.exit(anyFail ? 1 : 0);