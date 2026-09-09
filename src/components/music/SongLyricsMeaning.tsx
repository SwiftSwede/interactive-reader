"use client";

import InteractiveStory, {
  type WordTimestamp,
} from "@/components/InteractiveStory";
import type { WordData, ExpressionData } from "@/components/WordTooltip";
import type { WordFlagging } from "@/types";

export default function SongLyricsMeaning({
  bodyText,
  words,
  expressions,
  meaning,
  storyId,
  sessionId,
  trackLookups,
  flagging,
}: {
  bodyText: string;
  words: WordData[];
  expressions: ExpressionData[];
  meaning: string | null;
  storyId: string;
  sessionId?: string;
  trackLookups: boolean;
  flagging?: WordFlagging;
}) {
  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-block text-left">
          <h2 className="text-headline-lg text-text-primary mb-4">La letra</h2>
          <InteractiveStory
            bodyText={bodyText}
            words={words}
            expressions={expressions}
            audioUrl=""
            timestamps={[] as WordTimestamp[]}
            hideAudio
            kind="song"
            storyId={storyId}
            sessionId={sessionId}
            trackLookups={trackLookups}
            flagging={flagging}
          />
        </div>
      </div>
      {meaning?.trim() ? (
        <section className="mt-8 rounded-card border border-paper-line bg-white px-4 py-4">
          <h3 className="font-heading text-headline-md text-text-primary">
            Qué significa la canción
          </h3>
          <div className="mt-3 space-y-3 text-body-main text-text-primary">
            {meaning
              .split("\n")
              .filter((p) => p.trim())
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
