"use client";

import InteractiveStory from "@/components/InteractiveStory";
import type { WordData, ExpressionData } from "@/components/WordTooltip";

export default function SongBio({
  bio,
  words,
}: {
  bio: string;
  words: WordData[];
}) {
  return (
    <div>
      <h2 className="text-headline-lg text-text-primary mb-2">El artista</h2>
      <p className="mb-4 text-label-md text-text-secondary">
        Un poco de contexto. Toca una palabra si no la conoces.
      </p>
      <InteractiveStory
        bodyText={bio}
        words={words}
        expressions={[] as ExpressionData[]}
        audioUrl=""
        timestamps={[]}
        hideAudio
      />
    </div>
  );
}
