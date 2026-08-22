"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ── Types ──────────────────────────────────────────────────

type StoryAudioPlayerProps = {
  audioUrl: string;
  duration: number; // in seconds, from timestamps
  onTimeUpdate: (currentTime: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Spotify-style mini player. Visible only while story audio is playing.
// Portaled to document.body so position:fixed is never clipped by ancestors.
function StickyNowPlaying({
  currentTime,
  duration,
  onToggle,
}: {
  currentTime: number;
  duration: number;
  onToggle: () => void;
}) {
  const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <div className="sticky-audio-player" role="region" aria-label="Reproduciendo">
      <div className="sticky-audio-player-bar">
        <div
          className="sticky-audio-player-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(Math.floor(duration), 0)}
          aria-valuenow={Math.floor(currentTime)}
          aria-label="Progreso"
        >
          <div
            className="sticky-audio-player-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          onClick={onToggle}
          className="sticky-audio-player-toggle"
          aria-label="Pausar"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </button>

        <span className="sticky-audio-player-time">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export default function StoryAudioPlayer({
  audioUrl,
  duration,
  onTimeUpdate,
  onPlayStateChange,
}: StoryAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Interpolation refs: sync to audio.currentTime via timeupdate event,
  // then interpolate with performance.now() between updates.
  // On mobile, audio.currentTime jumps in chunks (large decoder buffers),
  // causing karaoke highlights to flash for 1 frame and disappear.
  // Interpolation gives smooth 60fps timing regardless.
  const audioTimeRef = useRef(0);
  const perfTimeRef = useRef(0);

  // RAF loop: interpolate between timeupdate events for smooth highlight
  const updateTime = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      const elapsed = (performance.now() - perfTimeRef.current) / 1000;
      const interpolatedTime = audioTimeRef.current + elapsed;
      setCurrentTime(interpolatedTime);
      onTimeUpdate(interpolatedTime);
      rafRef.current = requestAnimationFrame(updateTime);
    }
  }, [onTimeUpdate]);

  // Play/pause toggle
  const handleToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange(true);
      // Initialize interpolation refs so RAF starts from the right point
      audioTimeRef.current = audio.currentTime;
      perfTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(updateTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
      setCurrentTime(0);
      onTimeUpdate(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    // timeupdate fires every ~250ms on both desktop and mobile.
    // We use it to sync the interpolation base, correcting any drift.
    // We do NOT call onTimeUpdate here; the RAF loop handles that
    // to avoid double state updates and highlight jitter.
    const handleTimeUpdate = () => {
      audioTimeRef.current = audio.currentTime;
      perfTimeRef.current = performance.now();
    };

    const handleSeek = () => {
      audioTimeRef.current = audio.currentTime;
      perfTimeRef.current = performance.now();
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeked", handleSeek);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeked", handleSeek);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onTimeUpdate, onPlayStateChange, updateTime]);

  // Keep page content clear of the sticky bar while it is visible
  useEffect(() => {
    if (!isPlaying) {
      document.body.classList.remove("sticky-audio-active");
      return;
    }
    document.body.classList.add("sticky-audio-active");
    return () => {
      document.body.classList.remove("sticky-audio-active");
    };
  }, [isPlaying]);

  // Seek when user clicks on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mb-6 rounded-lg bg-blue-50 border border-blue-100 px-4 py-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Play/pause button */}
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm"
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
          type="button"
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <div className="flex flex-col flex-1 gap-1">
          <span className="text-sm font-medium text-blue-900">
            {isPlaying ? "Escuchando..." : "Lee y escucha"}
          </span>

          {/* Progress bar */}
          <div
            className="w-full h-2 bg-blue-200 rounded-full cursor-pointer relative"
            onClick={handleSeek}
          >
            <div
              className="absolute h-2 bg-blue-600 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Time display */}
        <span className="text-xs text-blue-400 tabular-nums flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {isPlaying
        ? createPortal(
            <StickyNowPlaying
              currentTime={currentTime}
              duration={duration}
              onToggle={handleToggle}
            />,
            document.body
          )
        : null}
    </div>
  );
}
