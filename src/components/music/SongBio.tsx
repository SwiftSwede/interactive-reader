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
      <InteractiveStory
        bodyText={bio}
        words={words}
        expressions={[] as ExpressionData[]}
        audioUrl=""
        timestamps={[]}
        hideAudio
        showSentenceNumbers={false}
      />
    </div>
  );
}
