// Generate one Edge TTS MP3 per sound-chart keyword and example word.
// Files land in public/audio/sounds/<slug>.mp3. Existing files are skipped.
// Voice matches scripts/generate-word-audio.py: en-US-AriaNeural, rate -10%.
// A later recording from Kyle replaces the file. The chart's slow tap uses
// playbackRate on this same clip. It does not need a second file.
//
// Run: npx tsx scripts/gen-sound-audio.ts

import { spawn } from "node:child_process";
import { access, copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { audioSlug, buildSoundChart } from "../src/lib/sound-guide";

const VOICE = "en-US-AriaNeural";
const RATE = "-10%";
const OUT_DIR = path.join(process.cwd(), "public", "audio", "sounds");
const WORD_DIR = path.join(process.cwd(), "public", "audio", "words");

function wordsToGenerate(): Map<string, string> {
  const chart = buildSoundChart();
  const words = new Map<string, string>();
  for (const cell of chart.cells) {
    for (const word of cell.exampleWords) {
      const slug = audioSlug(word);
      if (!slug || words.has(slug)) continue;
      words.set(slug, word);
    }
  }
  return words;
}

function runPython(script: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", script, ...args], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`python exited ${code}`));
    });
  });
}

const SAVE_SCRIPT = `
import asyncio, sys
import edge_tts
import edge_tts.communicate as communicate
from edge_tts.constants import TRUSTED_CLIENT_TOKEN, WSS_URL as LEGACY_WSS_URL

# The legacy Bing host started returning 403 on 2026-10-10. Edge Read Aloud
# moved to this host and still accepts the legacy token. Try it first.
communicate.WSS_URL = (
    "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
    f"?Ocp-Apim-Subscription-Key={TRUSTED_CLIENT_TOKEN}"
)

async def save(text, dest, voice, rate):
    await edge_tts.Communicate(text, voice, rate=rate).save(dest)

async def main():
    text, dest, voice, rate = sys.argv[1:5]
    try:
        await save(text, dest, voice, rate)
    except Exception:
        communicate.WSS_URL = LEGACY_WSS_URL
        await save(text, dest, voice, rate)

asyncio.run(main())
`;

async function fileExists(file: string): Promise<boolean> {
  try {
    const info = await stat(file);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const words = wordsToGenerate();
  let created = 0;
  let skipped = 0;

  for (const [slug, word] of words) {
    const dest = path.join(OUT_DIR, `${slug}.mp3`);
    if (await fileExists(dest)) {
      skipped += 1;
      continue;
    }
    const shared = path.join(WORD_DIR, `${slug}.mp3`);
    if (await fileExists(shared)) {
      await copyFile(shared, dest);
      created += 1;
      console.log(`copied ${slug}.mp3 from word audio (${word})`);
      continue;
    }
    await runPython(SAVE_SCRIPT, [word, dest, VOICE, RATE]);
    created += 1;
    console.log(`wrote ${slug}.mp3 (${word})`);
  }

  console.log(`done. created ${created}, skipped ${skipped}, total ${words.size}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
