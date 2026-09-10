"use client";

import { Play, Pause, SkipBack, SkipForward, Gauge } from "lucide-react";

// Spotify-style mini player. Callers portal this to document.body so
// pause stays on screen without scrolling back to the inline player.

function formatTime(seconds: number) {
  const m = Math.floor(seconds);
  const mins = Math.floor(m / 60);
  const s = m % 60;
  return `${mins}:${s.toString().padStart(2, "0")}`;
}

function remainingTime(currentTime: number, duration: number) {
  return Math.max(0, duration - currentTime);
}

export function SeekBar({
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

export default function StickyNowPlaying({
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
