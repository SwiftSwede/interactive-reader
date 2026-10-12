"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Video } from "lucide-react";
import SoundVideoModal from "@/components/SoundVideoModal";
import {
  CONSONANT_INTRO,
  DIPHTHONG_INTRO,
  MONOPHTHONG_INTRO,
  SLOW_TAP_MS,
  SPANISH_LENS_LEGEND,
  SPANISH_LENS_STORAGE_KEY,
  nextPlayback,
  type SoundCell,
  type SoundChart as SoundChartData,
  type SpanishRelation,
} from "@/lib/sound-guide";
import SoundDiagram from "./SoundDiagram";
import SoundNoteSheet from "./SoundNoteSheet";
import { playSoundUrl } from "./playSound";

function cardChrome(lens: boolean, relation: SpanishRelation | undefined) {
  const inverted = lens && relation === "igual";
  let border = "border-paper-line bg-surface";
  if (lens && relation === "parecido") border = "border-accent bg-surface";
  if (lens && relation === "unico") border = "border-dashed border-text-muted bg-surface";
  if (inverted) border = "border-text-primary bg-text-primary";
  return {
    inverted,
    card: border,
    ipa: inverted ? "text-surface" : "text-text-primary",
    name: inverted ? "text-surface" : "text-text-secondary",
    status: inverted ? "text-paper" : "text-text-muted",
    icon: inverted
      ? "text-paper hover:text-surface active:text-surface"
      : "text-text-muted hover:text-text-accent active:text-text-accent",
  };
}

const LEGEND_CHIP: Record<SpanishRelation, string> = {
  igual: "border-text-primary bg-text-primary text-surface",
  parecido: "border-accent bg-surface text-text-primary",
  unico: "border-dashed border-text-muted bg-surface text-text-primary",
};

function VowelKey() {
  return (
    <div className="text-label-sm text-text-secondary">
      <p className="flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-paper-line bg-surface"
          aria-hidden="true"
        />
        Vocales del inglés.
      </p>
      <p className="flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-accent bg-accent-soft"
          aria-hidden="true"
        />
        Vocales del español. Ahí está tu lengua hoy.
      </p>
    </div>
  );
}

function LensSwitch({
  lens,
  onToggle,
  inert = false,
}: {
  lens: boolean;
  onToggle: () => void;
  inert?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={lens}
      aria-label="Comparar con español"
      aria-hidden={inert || undefined}
      tabIndex={inert ? -1 : undefined}
      onClick={onToggle}
      className="ml-auto flex h-11 shrink-0 items-center gap-2"
    >
      <span
        className={`max-w-[5.5rem] text-left text-label-sm leading-4 ${
          lens ? "text-text-accent" : "text-text-muted"
        }`}
      >
        Comparar con español
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full ${
          lens ? "bg-accent" : "bg-paper-line"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-paper-line bg-surface transition-transform duration-200 motion-reduce:transition-none ${
            lens ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function SoundChart({ chart }: { chart: SoundChartData }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [videoSlug, setVideoSlug] = useState<string | null>(null);
  const [infoSlug, setInfoSlug] = useState<string | null>(null);
  const [lens, setLens] = useState(false);
  const [docked, setDocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ slug: string; at: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      setLens(localStorage.getItem(SPANISH_LENS_STORAGE_KEY) === "1");
    } catch {
      // localStorage can be blocked
    }
  }, []);

  useEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDocked(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function setLensPersisted(next: boolean) {
    setLens(next);
    try {
      localStorage.setItem(SPANISH_LENS_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage can be blocked
    }
  }

  const videoCell = chart.cells.find((cell) => cell.slug === videoSlug) ?? null;
  const infoCell = chart.cells.find((cell) => cell.slug === infoSlug) ?? null;
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
      <div ref={titleRef} className="flex items-center gap-3">
        <h1 className="min-w-0 text-headline-lg text-text-primary">Guía de sonidos</h1>
        <LensSwitch lens={lens} inert={docked} onToggle={() => setLensPersisted(!lens)} />
      </div>
      {docked
        ? createPortal(
            <div className="sound-chart-dock">
              <div className="sound-chart-dock-pill">
                <p className="min-w-0 font-heading text-headline-lg text-text-primary" aria-hidden="true">
                  Guía de sonidos
                </p>
                <LensSwitch lens={lens} onToggle={() => setLensPersisted(!lens)} />
              </div>
            </div>,
            document.body
          )
        : null}
      {lens ? (
        <div className="mt-3 flex gap-2">
          {SPANISH_LENS_LEGEND.map((item) => (
            <p
              key={item.relation}
              className={`min-w-0 shrink rounded-small border px-2 py-1 text-label-sm ${LEGEND_CHIP[item.relation]}`}
            >
              {item.text}
            </p>
          ))}
        </div>
      ) : null}

      <section className="mt-4">
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
            lens={lens}
            onPlay={play}
            onVideo={setVideoSlug}
            onInfo={setInfoSlug}
          />
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-headline-md text-text-primary">Vocales</h2>
        <SoundDiagram
          src={lens ? "/sounds/vowel-trapezoid-es.svg" : "/sounds/vowel-trapezoid.svg"}
          label="Monóftongos"
          intro={MONOPHTHONG_INTRO}
          note={lens ? <VowelKey /> : undefined}
          caption={captionFor("vowel-")}
          activeId={activeDiagram}
          onSelect={playDiagram}
        />
        <SoundDiagram
          src="/sounds/diphthong-trapezoid.svg"
          label="Diptongos"
          intro={DIPHTHONG_INTRO}
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
            lens={lens}
            onPlay={play}
            onVideo={setVideoSlug}
            onInfo={setInfoSlug}
          />
        ))}
      </section>

      <SoundVideoModal
        video={videoCell?.video ?? null}
        explanationHref={videoCell ? `/sounds/${videoCell.slug}` : null}
        onClose={() => setVideoSlug(null)}
      />
      <SoundNoteSheet
        note={infoCell?.spanishNote ?? null}
        slug={infoCell?.slug ?? null}
        onClose={() => setInfoSlug(null)}
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
  lens,
  onPlay,
  onVideo,
  onInfo,
}: {
  title: string;
  subtitle: string;
  cells: SoundCell[];
  activeSlug: string | null;
  audioError: string | null;
  lens: boolean;
  onPlay: (cell: SoundCell) => void;
  onVideo: (slug: string) => void;
  onInfo: (slug: string) => void;
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
          const chrome = cardChrome(lens, cell.spanishNote?.relation);
          return (
            <li key={cell.slug} className="min-w-0">
              <div className={`sound-card relative h-36 rounded-card border ${chrome.card}`}>
                <button
                  type="button"
                  className="flex h-full w-full flex-col items-center px-2 pb-2 pt-3 text-center"
                  onClick={() => onPlay(cell)}
                >
                  <span className={`ipa-text text-2xl leading-8 ${chrome.ipa}`}>
                    {cell.ipa}
                  </span>
                  <span className={`mt-1 line-clamp-2 h-10 text-label-sm leading-5 ${chrome.name}`}>
                    {cell.name}
                  </span>
                  <span className={`mt-1 h-5 w-full truncate text-label-sm leading-5 ${chrome.status}`}>
                    {status}
                  </span>
                </button>
                {cell.spanishNote ? (
                  <button
                    type="button"
                    className={`absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center ${chrome.icon}`}
                    aria-label={`Explicación de ${cell.name}`}
                    onClick={() => onInfo(cell.slug)}
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center ${chrome.icon}`}
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
