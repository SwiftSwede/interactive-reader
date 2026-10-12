// Generate one Mexican Spanish Edge TTS MP3 per Spanish monophthong ghost.
// Files land in public/audio/sounds/es/<slug>.mp3. Existing files are skipped.
// Voice is es-MX-DaliaNeural at -10%. A later recording from Kyle replaces
// the file. The chart's slow tap uses playbackRate on this same clip.
//
// Run: npx tsx scripts/gen-spanish-vowel-audio.ts

import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { SPANISH_VOWEL_GHOSTS, audioSlug } from "../src/lib/sound-guide";

const VOICE = "es-MX-DaliaNeural";
const RATE = "-10%";
const OUT_DIR = path.join(process.cwd(), "public", "audio", "sounds", "es");

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
  const force = new Set(
    process.argv.slice(2).filter((arg) => arg !== "--force")
  );
  const forceAll = process.argv.includes("--force") && force.size === 0;
  let created = 0;
  let skipped = 0;

  for (const ghost of SPANISH_VOWEL_GHOSTS) {
    const slug = audioSlug(ghost.word);
    const dest = path.join(OUT_DIR, `${slug}.mp3`);
    const replace = forceAll || force.has(slug) || force.has(ghost.word);
    if (!replace && (await fileExists(dest))) {
      skipped += 1;
      continue;
    }
    await runPython(SAVE_SCRIPT, [ghost.word, dest, VOICE, RATE]);
    created += 1;
    console.log(`wrote ${slug}.mp3 (${ghost.letter} → ${ghost.word})`);
  }

  console.log(
    `done. created ${created}, skipped ${skipped}, total ${SPANISH_VOWEL_GHOSTS.length}`
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
