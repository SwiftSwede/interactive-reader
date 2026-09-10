"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";
import ClassroomYoutubePlayer, {
  type YoutubePlayerHandle,
} from "@/components/ClassroomYoutubePlayer";
import StickyNowPlaying from "@/components/StickyNowPlaying";
import { usePlaybackRate } from "@/components/PlaybackRateContext";
import {
  karaokeLineNeedsRecenter,
  karaokeRecenterDelta,
  karaokeVisibleWell,
  parseLineTimestamps,
  parseLyricsIpa,
} from "@/lib/music";

export default function SongTruquitosKaraoke({
  bodyText,
  lyricsIpa,
  lineTimestamps,
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
  videoId: string;
  title: string;
  sessionId?: string;
  isTeacher: boolean;
  live: boolean;
  showSeekBack: boolean;
}) {
  const [truquitos, setTruquitos] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { rate, toggle: toggleSpeed } = usePlaybackRate();
  const showSticky = !live || isTeacher;
  const ipa = useMemo(() => parseLyricsIpa(lyricsIpa), [lyricsIpa]);
  const stamps = useMemo(
    () => parseLineTimestamps(lineTimestamps),
    [lineTimestamps]
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
  const currentStamp =
    currentLine == null ? null : stampByIndex.get(currentLine) ?? null;
  const [bar, setBar] = useState({ y: 0, h: 0, on: false });
  const [motionReady, setMotionReady] = useState(false);

  const karaokeLines = useMemo(() => {
    let indexed = 0;
    return bodyText.split("\n").map((raw) => {
      if (!raw.trim()) return { lineIndex: null as number | null, text: "" };
      const lineIndex = indexed;
      indexed += 1;
      return { lineIndex, text: raw };
    });
  }, [bodyText]);

  const measureHighlight = useCallback(() => {
    const track = trackRef.current;
    if (!track || currentLine == null) {
      setBar((prev) => ({ ...prev, on: false }));
      return;
    }
    const line = document.getElementById(`music-line-${currentLine}`);
    if (!line) return;
    const trackBox = track.getBoundingClientRect();
    const lineBox = line.getBoundingClientRect();
    setBar({
      y: lineBox.top - trackBox.top + track.scrollTop,
      h: lineBox.height,
      on: true,
    });
    setMotionReady(true);
  }, [currentLine]);

  useLayoutEffect(() => {
    measureHighlight();
  }, [measureHighlight, truquitos, karaokeLines]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureHighlight());
    observer.observe(track);
    return () => observer.disconnect();
  }, [measureHighlight]);

  useEffect(() => {
    playerRef.current?.setPlaybackRate(rate);
  }, [rate]);

  useEffect(() => {
    if (currentLine == null) return;
    const line = document.getElementById(`music-line-${currentLine}`);
    if (!line) return;
    const header = document.querySelector(".story-page-header");
    const sticky = document.querySelector(".sticky-audio-player-bar");
    const headerBottom =
      header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
    const stickyTop =
      sticky instanceof HTMLElement
        ? sticky.getBoundingClientRect().top
        : window.innerHeight;
    const well = karaokeVisibleWell(
      headerBottom,
      stickyTop,
      window.innerHeight,
    );
    const box = line.getBoundingClientRect();
    if (!karaokeLineNeedsRecenter(box.top, box.bottom, well.top, well.bottom)) {
      return;
    }
    const delta = karaokeRecenterDelta(
      box.top,
      box.bottom,
      well.top,
      well.bottom,
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({
      top: delta,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [currentLine, hasStarted, showSticky]);

  useEffect(() => {
    if (!showSticky || !hasStarted) {
      document.body.classList.remove("sticky-audio-active");
      return;
    }
    document.body.classList.add("sticky-audio-active");
    return () => {
      document.body.classList.remove("sticky-audio-active");
    };
  }, [showSticky, hasStarted]);

  const rewindY = bar.y + (bar.h - 44) / 2;
  const readyClass = motionReady ? " is-ready" : "";

  const jumpToLine = (startSeconds: number) => {
    playerRef.current?.seekTo(startSeconds);
    playerRef.current?.play();
  };

  const handlePlayhead = useCallback((seconds: number) => {
    setPlayhead(seconds);
    const nextDuration = playerRef.current?.getDuration() ?? 0;
    if (nextDuration > 0) setDuration(nextDuration);
  }, []);

  const handlePlayState = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    if (playing) setHasStarted(true);
  }, []);

  const handleToggle = () => {
    if (isPlaying) playerRef.current?.pause();
    else playerRef.current?.play();
  };

  const handleSeek = (time: number) => {
    const max = duration > 0 ? duration : time;
    playerRef.current?.seekTo(Math.max(0, Math.min(time, max)));
  };

  const handleSkip = (delta: number) => {
    handleSeek(playhead + delta);
  };

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
          onTimeUpdate={handlePlayhead}
          onPlayStateChange={handlePlayState}
        />
      </div>
      <div className="flex justify-center">
        <div
          ref={trackRef}
          className={`karaoke-track${showSeekBack ? " karaoke-track-replay" : ""}`}
        >
          <div
            className={`karaoke-highlight${bar.on ? " is-on" : ""}${readyClass}`}
            style={{
              transform: `translateY(${bar.y}px)`,
              height: bar.h,
            }}
            aria-hidden="true"
          />
          {showSeekBack ? (
            <button
              type="button"
              className={`karaoke-rewind${currentStamp ? " is-on" : ""}${readyClass}`}
              style={{ transform: `translateY(${rewindY}px)` }}
              aria-label="Escuchar esta línea de nuevo"
              disabled={!currentStamp}
              onClick={() => {
                if (!currentStamp) return;
                jumpToLine(currentStamp.startSeconds);
              }}
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          ) : null}
          <div className="karaoke-lyrics text-story-body text-text-primary">
            <h2 className="text-headline-lg text-text-primary mb-4">
              Truquitos y karaoke
            </h2>
            {karaokeLines.map((line, index) => {
              if (line.lineIndex === null) {
                return <div key={`gap-${index}`} className="h-8" />;
              }
              const lineIndex = line.lineIndex;
              const ipaText = ipaByIndex.get(lineIndex);
              const stamp = stampByIndex.get(lineIndex);
              const display = truquitos && ipaText ? ipaText : line.text;
              const canJump = Boolean(showSeekBack && stamp);
              if (canJump && stamp) {
                return (
                  <button
                    key={`${lineIndex}-${index}`}
                    type="button"
                    id={`music-line-${lineIndex}`}
                    className="karaoke-line karaoke-line-jump"
                    aria-label={`Escuchar: ${line.text}`}
                    onClick={() => jumpToLine(stamp.startSeconds)}
                  >
                    {display}
                  </button>
                );
              }
              return (
                <p
                  key={`${lineIndex}-${index}`}
                  id={`music-line-${lineIndex}`}
                  className="karaoke-line"
                >
                  {display}
                </p>
              );
            })}
          </div>
        </div>
      </div>
      {showSticky && hasStarted
        ? createPortal(
            <StickyNowPlaying
              currentTime={playhead}
              duration={duration}
              isPlaying={isPlaying}
              rate={rate}
              onToggle={handleToggle}
              onSeek={handleSeek}
              onSkip={handleSkip}
              onToggleSpeed={toggleSpeed}
            />,
            document.body
          )
        : null}
    </div>
  );
}
