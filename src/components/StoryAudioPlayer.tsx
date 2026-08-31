"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, SkipBack, SkipForward, Gauge } from "lucide-react";
import { usePlaybackRate } from "./PlaybackRateContext";

// ── Types ──────────────────────────────────────────────────

type StoryAudioPlayerProps = {
  audioUrl: string;
  duration: number; // in seconds, from timestamps
  onTimeUpdate: (currentTime: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds);
  const mins = Math.floor(m / 60);
  const s = m % 60;
  return `${mins}:${s.toString().padStart(2, "0")}`;
}

function remainingTime(currentTime: number, duration: number) {
  return Math.max(0, duration - currentTime);
}

function SeekBar({
  currentTime,
  duration,
  onSeek,
  compact = false,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  compact?: boolean;
}) {
  const max = Math.max(duration, 0);
  const progressPercent = max > 0 ? Math.min((currentTime / max) * 100, 100) : 0;

  return (
    <div className={compact ? "sticky-audio-player-seek" : "audio-seek-row"}>
      <span className="audio-seek-time" aria-label="Tiempo transcurrido">
        {formatTime(currentTime)}
      </span>
      <div className="audio-seek-wrap">
        <div className="audio-seek-track" aria-hidden="true">
          <div
            className="audio-seek-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <input
          type="range"
          className="audio-seek"
          min={0}
          max={max || 0}
          step={0.1}
          value={Math.min(currentTime, max)}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Progreso"
        />
      </div>
      <span className="audio-seek-time" aria-label="Tiempo restante">
        {formatTime(remainingTime(currentTime, duration))}
      </span>
    </div>
  );
}

// Spotify-style mini player. Stays after first play so pause/resume
// does not force a scroll back to the top player.
// Portaled to document.body so position:fixed is never clipped by ancestors.
function StickyNowPlaying({
  currentTime,
  duration,
  isPlaying,
  rate,
  onToggle,
  onSeek,
  onSkip,
  onToggleSpeed,
}: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  rate: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onSkip: (delta: number) => void;
  onToggleSpeed: () => void;
}) {
  return (
    <div
      className="sticky-audio-player"
      role="region"
      aria-label={isPlaying ? "Reproduciendo" : "Audio pausado"}
    >
      <div className="sticky-audio-player-bar">
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          compact
        />

        <div className="sticky-audio-player-controls">
          <div className="sticky-audio-player-controls-slot" aria-hidden="true" />
          <div className="sticky-audio-player-transport">
            <button
              type="button"
              className="audio-skip-btn"
              onClick={() => onSkip(-10)}
              aria-label="Retroceder 10 segundos"
            >
              <SkipBack size={16} aria-hidden="true" />
              <span className="text-[11px]">10s</span>
            </button>
            <button
              onClick={onToggle}
              className="sticky-audio-player-toggle"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              type="button"
            >
              {isPlaying ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="audio-skip-btn"
              onClick={() => onSkip(10)}
              aria-label="Adelantar 10 segundos"
            >
              <span className="text-[11px]">10s</span>
              <SkipForward size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="sticky-audio-player-controls-slot">
            <button
              type="button"
              className="audio-speed-btn"
              onClick={onToggleSpeed}
              aria-label={`Velocidad ${rate}x`}
            >
              <Gauge size={16} aria-hidden="true" />
              <span className="text-[11px]">{rate}x</span>
            </button>
          </div>
        </div>
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
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);
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
      audio.playbackRate = rate;
      audio.play();
    } else {
      audio.pause();
    }
  }, [rate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
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
    if (!hasStarted) {
      document.body.classList.remove("sticky-audio-active");
      return;
    }
    document.body.classList.add("sticky-audio-active");
    return () => {
      document.body.classList.remove("sticky-audio-active");
    };
  }, [hasStarted]);

  const speedLabel = rate === 1 ? "1x" : "0.75x";

  return (
    <div className="mb-6 rounded-card bg-audio-bg border border-audio-border px-4 py-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      <div className="flex flex-col gap-2">
        <div className="audio-player-controls">
          <span className="audio-player-status">
            {isPlaying ? "Escuchando..." : "Lee y escucha"}
          </span>
          <div className="audio-player-transport">
            <button
              type="button"
              className="audio-skip-btn"
              onClick={() => handleSkip(-10)}
              aria-label="Retroceder 10 segundos"
            >
              <SkipBack size={16} aria-hidden="true" />
              <span className="text-[11px]">10s</span>
            </button>
            <button
              onClick={handleToggle}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors flex-shrink-0"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              type="button"
            >
              {isPlaying ? (
                <Pause size={20} aria-hidden="true" />
              ) : (
                <Play size={20} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="audio-skip-btn"
              onClick={() => handleSkip(10)}
              aria-label="Adelantar 10 segundos"
            >
              <span className="text-[11px]">10s</span>
              <SkipForward size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="audio-player-end">
            <button
              type="button"
              className="audio-speed-btn"
              onClick={toggleSpeed}
              aria-label={`Velocidad ${speedLabel}`}
            >
              <Gauge size={16} aria-hidden="true" />
              <span className="text-[11px]">{speedLabel}</span>
            </button>
          </div>
        </div>
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={applyTime}
        />
      </div>

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
