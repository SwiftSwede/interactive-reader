"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import { usePlaybackRate } from "./PlaybackRateContext";
import StickyNowPlaying from "./StickyNowPlaying";

type StoryAudioPlayerProps = {
  audioUrl: string;
  duration: number; // in seconds, from timestamps
  onTimeUpdate: (currentTime: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
};

// ── Component ──────────────────────────────────────────────

export default function StoryAudioPlayer({
  audioUrl,
  duration,
  onTimeUpdate,
  onPlayStateChange,
}: StoryAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const rafRef = useRef<number | null>(null);
  const triedPlayRef = useRef(false);
  const { rate, toggle: toggleSpeed } = usePlaybackRate();

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

  const applyTime = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const max = duration > 0 ? duration : audio.duration || 0;
      const next = Math.max(0, Math.min(time, max));
      audio.currentTime = next;
      audioTimeRef.current = next;
      perfTimeRef.current = performance.now();
      setCurrentTime(next);
      onTimeUpdate(next);
    },
    [duration, onTimeUpdate]
  );

  const handleSkip = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      applyTime(audio.currentTime + delta);
    },
    [applyTime]
  );

  // Play/pause toggle
  const handleToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      triedPlayRef.current = true;
      setAudioError(false);
      audio.playbackRate = rate;
      audio.play().catch(() => {
        setAudioError(true);
        setIsPlaying(false);
        onPlayStateChange(false);
      });
    } else {
      audio.pause();
    }
  }, [onPlayStateChange, rate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setAudioError(false);
      setHasStarted(true);
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

    const handleError = () => {
      if (!triedPlayRef.current) return;
      setAudioError(true);
      setIsPlaying(false);
      onPlayStateChange(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeked", handleSeek);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeked", handleSeek);
      audio.removeEventListener("error", handleError);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onTimeUpdate, onPlayStateChange, updateTime]);

  // Keep page content clear of the sticky bar while it is visible
  useEffect(() => {
    if (!hasStarted) {
      document.body.classList.remove("sticky-audio-active");
      return;
    }
    document.body.classList.add("sticky-audio-active");
    return () => {
      document.body.classList.remove("sticky-audio-active");
    };
  }, [hasStarted]);

  return (
    <div className={`relative ${hasStarted ? "" : "mb-6"}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      />

      {audioError ? (
        <p className="mb-3 text-label-md text-text-secondary" role="alert">
          No pude cargar el audio. Toca play otra vez.
        </p>
      ) : null}

      {hasStarted ? null : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
            aria-label="Escuchar"
            type="button"
          >
            <Play size={20} aria-hidden="true" />
          </button>
          <span className="text-label-md text-text-secondary">Escuchar</span>
        </div>
      )}

      {hasStarted
        ? createPortal(
            <StickyNowPlaying
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              rate={rate}
              onToggle={handleToggle}
              onSeek={applyTime}
              onSkip={handleSkip}
              onToggleSpeed={toggleSpeed}
            />,
            document.body
          )
        : null}
    </div>
  );
}
