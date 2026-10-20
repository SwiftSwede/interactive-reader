// DEV-ONLY repro harness for the Iplo player. Delete after the playthrough.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAudioScript } from "@/lib/iplo";
import AudioCoursePlayer from "@/components/AudioCoursePlayer";

export const dynamic = "force-dynamic";

const DAY_FILES: Record<string, { file: string; duration: number }> = {
  "1": { file: "/audio/iplo/day-1-filled.m4a", duration: 864.4 },
  // Filled: donor replay spliced at 1180 (+2.80s); segments are on this timeline.
  "2": { file: "/audio/iplo/day-2-filled.m4a", duration: 1287.02 },
  // Closed-loop repairs pending: a few taught woman lines are absent from the recording.
  // Filled from the original take, cut list in segments JSON fill metadata (donors: Yes-you x2, Yes-her x2, Does-she x2, composite French, walk donor, Yes-her 182.5, Does-she 103.5, composite Do-you-guys-speak-French 314.5, walk-donor 755.1) + 9 acoustic pockets + ending narration; 2026-10-18.
  "3": { file: "/audio/iplo/day-3-filled.m4a", duration: 992.30 },
  // Filled: donor "In the afternoon." spliced at 366.15 (+1.5s); segments are on this timeline.
  "4": { file: "/audio/iplo/day-4-filled.m4a", duration: 1022.70 },
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const day = sp.day && DAY_FILES[sp.day] ? sp.day : "1";
  const info = DAY_FILES[day];
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), `scripts/iplo/day${day}-segments.json`), "utf8")
  );
  const script = parseAudioScript({
    audioUrl: info.file,
    grammarTagId: "dev",
    durationSeconds: info.duration,
    segments: raw.segments,
  });
  if (!script) return <p>Script failed parseAudioScript.</p>;
  return (
    <AudioCoursePlayer
      storyId="dev-repro"
      title={`DIAG Día ${day}`}
      level="beginner"
      script={script}
      completedOnce={false}
      dayMarks={[]}
      closingLine={false}
      writes={false}
      isTeacher
      previewLevel={null}
      viewToggle={null}
    />
  );
}