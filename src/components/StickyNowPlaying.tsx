"use client";

import { useRef, useState } from "react";
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
  // One seek on release. Seeking on every drag tick leaves the decoder on a
  // different word than the clock, and the captions stay wrong after that.
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const dragValueRef = useRef<number | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const shown = dragValue ?? Math.min(currentTime, max);
  const progressPercent = max > 0 ? Math.min((shown / max) * 100, 100) : 0;

  function setDrag(value: number) {
    dragValueRef.current = value;
    setDragValue(value);
  }

  function commit(value: number) {
    const next = dragValueRef.current ?? value;
    if (dragging.current && Math.abs(next - dragStart.current) > 0.05) onSeek(next);
    dragging.current = false;
    dragValueRef.current = null;
    setDragValue(null);
  }

  return (
    <div className={compact ? "sticky-audio-player-seek" : "audio-seek-row"}>
      <span className="audio-seek-time" aria-label="Tiempo transcurrido">
        {formatTime(shown)}
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
          value={shown}
          onPointerDown={(e) => {
            dragging.current = true;
            dragStart.current = Number(e.currentTarget.value);
          }}
          onPointerUp={(e) => commit(Number(e.currentTarget.value))}
          onPointerCancel={() => {
            dragging.current = false;
            dragValueRef.current = null;
            setDragValue(null);
          }}
          onKeyDown={(e) => {
            dragging.current = true;
            dragStart.current = Number(e.currentTarget.value);
          }}
          onKeyUp={(e) => commit(Number(e.currentTarget.value))}
          onBlur={() => {
            dragging.current = false;
            dragValueRef.current = null;
            setDragValue(null);
          }}
          onChange={(e) => {
            if (!dragging.current) return;
            setDrag(Number(e.target.value));
          }}
          aria-label="Progreso"
        />
      </div>
      <span className="audio-seek-time" aria-label="Tiempo restante">
        {formatTime(remainingTime(shown, duration))}
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
              <span className="text-label-sm">10s</span>
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
              <span className="text-label-sm">10s</span>
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
              <span className="text-label-sm">{rate}x</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
