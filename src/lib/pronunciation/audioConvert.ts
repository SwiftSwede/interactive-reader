import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";

type ConvertResult = {
  wavPath: string;
  cleanup: () => Promise<void>;
};

function assertFfmpegPath(): string {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
  return ffmpegPath;
}

async function runFfmpeg(args: string[]): Promise<void> {
  const bin = assertFfmpegPath();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg failed (exit ${code}). ${stderr}`.trim()));
    });
  });
}

export async function convertToWavPcm16kMono(params: {
  inputBuffer: Buffer;
  inputExtensionHint?: string;
}): Promise<ConvertResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pronunciation-"));
  const inExt = (params.inputExtensionHint || "webm").replace(".", "");
  const inputPath = path.join(tmpDir, `input-${randomUUID()}.${inExt}`);
  const wavPath = path.join(tmpDir, `audio-${randomUUID()}.wav`);

  await fs.writeFile(inputPath, params.inputBuffer);

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wavPath,
  ];

  await runFfmpeg(args);

  const cleanup = async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  return { wavPath, cleanup };
}
