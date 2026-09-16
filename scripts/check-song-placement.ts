// Placement + IPA alignment check for any seeded song.
// Runs the REAL placeLyricBlanks + indexedLyricLines from src/lib/music against
// the SONGS entry in seed-music.ts. Catches silent blank-placement failures
// (wrong prompt encoding, repeated-id lines, out-of-range IPA) BEFORE seeding.
//
// Usage:
//   npx tsx scripts/check-song-placement.ts --slug white-is-red
//   npx tsx scripts/check-song-placement.ts               # all songs
//
// Exits 1 on any mismatch. Prints a lyrics||IPA side-by-side for eyeball review.
import { placeLyricBlanks, indexedLyricLines } from "../src/lib/music";
import { SONGS } from "./seed-music";

const slugIdx = process.argv.indexOf("--slug");
const slugArg = slugIdx >= 0 ? process.argv[slugIdx + 1] : null;
const songs = slugArg ? SONGS.filter((s) => s.slug === slugArg) : SONGS;

if (songs.length === 0) {
  console.error(`No song with slug "${slugArg}" in SONGS.`);
  process.exit(1);
}

let anyFail = false;

for (const song of songs) {
  console.log(`\n=== ${song.slug} (${song.title}) ===`);
  const lines = indexedLyricLines(song.body);
  console.log(`Non-empty lines: ${lines.length}`);

  // --- IPA count + range ---
  const ipa = song.lyricsIpa ?? [];
  if (ipa.length !== lines.length) {
    console.log(
      `  WARNING: IPA count ${ipa.length} != line count ${lines.length}`
    );
  }
  const ipaByIndex = new Map<number, string>();
  for (const row of ipa) {
    if (row.line_index > lines.length - 1) {
      anyFail = true;
      console.log(
        `  MISMATCH: IPA line_index ${row.line_index} out of range (max ${lines.length - 1})`
      );
    }
    if (ipaByIndex.has(row.line_index)) {
      anyFail = true;
      console.log(`  MISMATCH: IPA line_index ${row.line_index} duplicated`);
    }
    ipaByIndex.set(row.line_index, row.ipa_text);
  }

  // --- Blank placements ---
  const placed = placeLyricBlanks(song.body, song.lyricBlanks);
  const actual = new Map<number, number>();
  const details: string[] = [];
  for (const line of placed) {
    if (line.lineIndex === null) continue;
    const idx = line.lineIndex;
    for (const seg of line.segments) {
      if (seg.kind === "blank") {
        actual.set(seg.blankId, (actual.get(seg.blankId) ?? 0) + 1);
        details.push(
          `  line ${idx} [${lines[idx]}] -> blank ${seg.blankId} (${seg.answer})`
        );
      }
    }
  }
  console.log(`\nPlacements (${details.length}):`);
  details.forEach((d) => console.log(d));

  // Expected = number of entries per id (repeated ids have multiple entries)
  const expected = new Map<number, number>();
  for (const blank of song.lyricBlanks) {
    expected.set(blank.id, (expected.get(blank.id) ?? 0) + 1);
  }
  console.log("\nPlacement counts:");
  for (const [id, count] of expected) {
    const got = actual.get(id) ?? 0;
    const okStr = got === count ? "OK" : "MISMATCH";
    if (got !== count) anyFail = true;
    console.log(`  blank ${id}: expected ${count}, got ${got} ${okStr}`);
  }
  // Also the reverse: no blank placed that isn't in the array
  for (const id of actual.keys()) {
    if (!expected.has(id)) {
      anyFail = true;
      console.log(`  MISMATCH: placed unknown blank id ${id}`);
    }
  }

  // --- Side-by-side lyrics || IPA for eyeball alignment ---
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
