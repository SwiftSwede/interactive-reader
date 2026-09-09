"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import ClassroomYoutubePlayer, {
  type YoutubePlayerHandle,
} from "@/components/ClassroomYoutubePlayer";
import {
  parseLineTimestamps,
  parseLyricsIpa,
  placeLyricBlanks,
  seekBackSeconds,
} from "@/lib/music";
import type { LyricBlank } from "@/types";

export default function SongTruquitosKaraoke({
  bodyText,
  lyricsIpa,
  lineTimestamps,
  lyricBlanks,
  videoId,
  title,
  sessionId,
  isTeacher,
  live,
  showSeekBack,
}: {
  bodyText: string;
  lyricsIpa: unknown;
  lineTimestamps: unknown;
  lyricBlanks: LyricBlank[];
  videoId: string;
  title: string;
  sessionId?: string;
  isTeacher: boolean;
  live: boolean;
  showSeekBack: boolean;
}) {
  const [truquitos, setTruquitos] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const ipa = useMemo(() => parseLyricsIpa(lyricsIpa), [lyricsIpa]);
  const stamps = useMemo(
    () => parseLineTimestamps(lineTimestamps),
    [lineTimestamps]
  );
  const placed = useMemo(
    () => placeLyricBlanks(bodyText, lyricBlanks),
    [bodyText, lyricBlanks]
  );
  const ipaByIndex = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of ipa) map.set(row.lineIndex, row.ipaText);
    return map;
  }, [ipa]);
  const stampByIndex = useMemo(() => {
    const map = new Map<number, { startSeconds: number; endSeconds: number }>();
    for (const row of stamps) {
      map.set(row.lineIndex, {
        startSeconds: row.startSeconds,
        endSeconds: row.endSeconds,
      });
    }
    return map;
  }, [stamps]);

  const currentLine = stamps.find(
    (row) => playhead >= row.startSeconds && playhead < row.endSeconds
  )?.lineIndex;
  const lastScrolled = useRef<number | null>(null);

  useEffect(() => {
    if (currentLine == null || currentLine === lastScrolled.current) return;
    lastScrolled.current = currentLine;
    const node = document.getElementById(`music-line-${currentLine}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node?.scrollIntoView({
      block: "center",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [currentLine]);

  const karaokeLines = useMemo(() => {
    let indexed = 0;
    return bodyText.split("\n").map((raw) => {
      if (!raw.trim()) return { lineIndex: null as number | null, text: "" };
      const lineIndex = indexed;
      indexed += 1;
      return { lineIndex, text: raw };
    });
  }, [bodyText]);

  const blankLineIndexes = useMemo(() => {
    const set = new Set<number>();
    for (const line of placed) {
      if (line.lineIndex === null) continue;
      if (line.segments.some((seg) => seg.kind === "blank")) {
        set.add(line.lineIndex);
      }
    }
    return set;
  }, [placed]);

  return (
    <div>
      <label className="mb-4 flex min-h-11 items-center gap-3 text-label-md text-text-primary">
        <input
          type="checkbox"
          checked={truquitos}
          onChange={(event) => setTruquitos(event.target.checked)}
          className="h-5 w-5 accent-[var(--accent)]"
        />
        Truquitos
      </label>
      <div className="mb-6">
        <ClassroomYoutubePlayer
          ref={playerRef}
          videoId={videoId}
          title={title}
          sessionId={sessionId}
          isTeacher={isTeacher}
          live={live}
          onTimeUpdate={setPlayhead}
        />
      </div>
      <div className="flex justify-center">
        <div className="inline-block text-left text-story-body text-text-primary">
          <h2 className="text-headline-lg text-text-primary mb-4">
            Truquitos y karaoke
          </h2>
          {karaokeLines.map((line, index) => {
            if (line.lineIndex === null) {
              return <div key={`gap-${index}`} className="h-8" />;
            }
            const lineIndex = line.lineIndex;
            const active = currentLine === lineIndex;
            const ipaText = ipaByIndex.get(lineIndex);
            const stamp = stampByIndex.get(lineIndex);
            const showReplay =
              showSeekBack && stamp && blankLineIndexes.has(lineIndex);
            return (
              <p
                key={`${lineIndex}-${index}`}
                id={`music-line-${lineIndex}`}
                className={`mb-0 flex items-start gap-2 rounded-small px-1 py-1 ${
                  active ? "bg-accent-soft" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  {truquitos && ipaText ? ipaText : line.text}
                </span>
                {showReplay ? (
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-text-accent hover:bg-surface-hover"
                    aria-label="Escuchar de nuevo esta línea"
                    onClick={() =>
                      playerRef.current?.seekTo(
                        seekBackSeconds(stamp.startSeconds)
                      )
                    }
                  >
                    <RotateCcw size={18} aria-hidden="true" />
                  </button>
                ) : null}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
