"use client";

import { useRef, useState } from "react";
import { Video } from "lucide-react";
import SoundVideoModal from "@/components/SoundVideoModal";
import {
  CHART_HEADER,
  CONSONANT_INTRO,
  SLOW_TAP_MS,
  VOWEL_INTRO,
  nextPlayback,
  type SoundCell,
  type SoundChart as SoundChartData,
} from "@/lib/sound-guide";
import SoundDiagram from "./SoundDiagram";
import { playSoundUrl } from "./playSound";

export default function SoundChart({ chart }: { chart: SoundChartData }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [videoSlug, setVideoSlug] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const lastTap = useRef<{ slug: string; at: number } | null>(null);
  const timer = useRef<number | null>(null);

  const videoCell = chart.cells.find((cell) => cell.slug === videoSlug) ?? null;
  const consonantSections = chart.sections.filter((section) => section.kind === "consonant");
  const vowelSections = chart.sections.filter((section) => section.kind === "vowel");

  function captionFor(prefix: string): string {
    if (!activeDiagram?.startsWith(prefix)) return "";
    return chart.cells.find((cell) => cell.diagramId === activeDiagram)?.name ?? "";
  }

  function play(cell: SoundCell) {
    if (!cell.audioPath) {
      setAudioError(cell.slug);
      return;
    }
    const now = Date.now();
    const same = lastTap.current?.slug === cell.slug;
    const elapsed = same && lastTap.current ? now - lastTap.current.at : Number.POSITIVE_INFINITY;
    const mode = nextPlayback(same, elapsed);
    lastTap.current = { slug: cell.slug, at: now };
    setAudioError(null);
    setActiveSlug(cell.slug);
    setActiveDiagram(cell.diagramId);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setActiveSlug((current) => (current === cell.slug ? null : current));
    }, SLOW_TAP_MS);

    playSoundUrl(cell.audioPath, mode === "slow" ? 0.75 : 1).catch(() => {
      setAudioError(cell.slug);
    });
  }

  function playDiagram(id: string) {
    const cell = chart.cells.find((item) => item.diagramId === id);
    if (cell) play(cell);
  }

  return (
    <>
      <p className="text-body-main text-text-secondary">{CHART_HEADER}</p>

      <section className="mt-8">
        <h2 className="text-headline-md text-text-primary">Consonantes</h2>
        <p className="mt-2 text-body-main text-text-secondary">{CONSONANT_INTRO}</p>
        {consonantSections.map((section) => (
          <SoundSection
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            cells={section.cells}
            activeSlug={activeSlug}
            audioError={audioError}
            onPlay={play}
            onVideo={setVideoSlug}
          />
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-headline-md text-text-primary">Vocales</h2>
        <p className="mt-2 text-body-main text-text-secondary">{VOWEL_INTRO}</p>
        <SoundDiagram
          src="/sounds/vowel-trapezoid.svg"
          label="Monóftongos"
          caption={captionFor("vowel-")}
          activeId={activeDiagram}
          onSelect={playDiagram}
        />
        <SoundDiagram
          src="/sounds/diphthong-trapezoid.svg"
          label="Diptongos"
          caption={captionFor("diphthong-")}
          activeId={activeDiagram}
          onSelect={playDiagram}
        />
        {vowelSections.map((section) => (
          <SoundSection
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            cells={section.cells}
            activeSlug={activeSlug}
            audioError={audioError}
            onPlay={play}
            onVideo={setVideoSlug}
          />
        ))}
      </section>

      <SoundVideoModal
        video={videoCell?.video ?? null}
        explanationHref={videoCell ? `/sounds/${videoCell.slug}` : null}
        onClose={() => setVideoSlug(null)}
      />
    </>
  );
}

function SoundSection({
  title,
  subtitle,
  cells,
  activeSlug,
  audioError,
  onPlay,
  onVideo,
}: {
  title: string;
  subtitle: string;
  cells: SoundCell[];
  activeSlug: string | null;
  audioError: string | null;
  onPlay: (cell: SoundCell) => void;
  onVideo: (slug: string) => void;
}) {
  return (
    <div className="mt-8">
      <h3 className="text-headline-md text-text-primary">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-label-md text-text-secondary">{subtitle}</p>
      ) : null}
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {cells.map((cell) => {
          const status =
            audioError === cell.slug
              ? "Sin audio"
              : activeSlug === cell.slug
                ? "Más lento"
                : cell.keyword;
          return (
            <li key={cell.slug} className="min-w-0">
              <div className="sound-card relative h-36 rounded-card border border-paper-line bg-surface">
                <button
                  type="button"
                  className="flex h-full w-full flex-col items-center px-2 pb-2 pt-3 text-center"
                  onClick={() => onPlay(cell)}
                >
                  <span className="ipa-text text-2xl leading-8 text-text-primary">
                    {cell.ipa}
                  </span>
                  <span className="mt-1 line-clamp-2 h-10 text-label-sm leading-5 text-text-secondary">
                    {cell.name}
                  </span>
                  <span className="mt-1 h-5 w-full truncate text-label-sm leading-5 text-text-muted">
                    {status}
                  </span>
                </button>
                <button
                  type="button"
                  className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center text-text-muted hover:text-text-accent active:text-text-accent"
                  aria-label={`Video de ${cell.name}`}
                  onClick={() => onVideo(cell.slug)}
                >
                  <Video className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
