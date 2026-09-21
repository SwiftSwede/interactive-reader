"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InteractiveStory from "@/components/InteractiveStory";
import CharacterBand from "@/components/movietalk/CharacterBand";
import {
  movieTalkCharacters,
  splitTranscriptScenes,
} from "@/lib/movietalk";
import type { LoadedStory } from "@/lib/stories";
import type { WordFlagging } from "@/types";

export default function SceneDialogue({
  data,
  sceneIndex,
  sessionId,
  trackLookups,
  flagging,
}: {
  data: LoadedStory;
  sceneIndex: number;
  sessionId?: string;
  trackLookups: boolean;
  flagging?: WordFlagging;
}) {
  const { story, words, expressions, movieTalkScenes } = data;
  const transcripts = splitTranscriptScenes(story.body_text);
  if (transcripts.length !== movieTalkScenes.length) {
    console.warn(
      `Movie Talk ${story.slug}: transcript scenes (${transcripts.length}) do not match scene rows (${movieTalkScenes.length}).`
    );
  }
  const sceneTranscript =
    transcripts[sceneIndex] ?? transcripts[0] ?? story.body_text;
  const characters = movieTalkCharacters([sceneTranscript]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sticky, setSticky] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(null);
    setSticky(false);
  }, [sceneIndex]);

  useEffect(() => {
    const node = bandRef.current;
    if (!node || characters.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-96px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [characters.length, sceneIndex]);

  useEffect(() => {
    if (!sticky) {
      document.body.classList.remove("sticky-character-band-active");
      return;
    }
    document.body.classList.add("sticky-character-band-active");
    return () => {
      document.body.classList.remove("sticky-character-band-active");
    };
  }, [sticky]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const node = wrapRef.current;
      if (!node) return;
      const path = event.composedPath();
      if (path.includes(node)) return;
      const onBand = path.some(
        (entry) =>
          entry instanceof Element &&
          entry.closest("[data-character-band]") != null
      );
      if (onBand) return;
      setSelected(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={wrapRef}>
      <h2 className="text-headline-lg text-text-primary mb-2">Diálogo</h2>
      <p className="mb-4 text-label-md text-text-secondary">
        Toca un personaje para marcar sus líneas. Toca fuera para quitar la
        marca.
      </p>
      <div
        ref={bandRef}
        className="mb-4"
        aria-hidden={sticky || undefined}
      >
        <CharacterBand
          characters={characters}
          selected={selected}
          onSelect={setSelected}
          className="-mx-4 px-4"
        />
      </div>
      <InteractiveStory
        bodyText={story.body_text}
        words={words}
        expressions={expressions}
        audioUrl=""
        timestamps={[]}
        hideAudio
        storyId={story.id}
        sessionId={sessionId}
        trackLookups={trackLookups}
        kind="movie_talk"
        flagging={flagging}
        visibleSceneIndex={sceneIndex}
        highlightSpeaker={selected}
      />
      {sticky && characters.length > 0
        ? createPortal(
            <div className="sticky-character-band" role="presentation">
              <div className="sticky-character-band-bar">
                <CharacterBand
                  characters={characters}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
