import { createClient } from "@/lib/supabase/server";
import SoundVideoProvider from "@/components/SoundVideoProvider";
import StorySteps from "@/components/StorySteps";
import { getSoundVideos } from "@/lib/sound-videos";
import {
  SOCCER_JERSEY_CORAL_IPA,
  SOCCER_JERSEY_WORD_NOTES,
} from "@/lib/sound-catalog";
import type { LoadedStory } from "@/lib/stories";
import type { SavedComprehensionResponse } from "@/components/ComprehensionQuestions";
import type { WordTimestamp } from "@/components/InteractiveStory";
import { readFileSync } from "fs";
import { join } from "path";

const FALLBACK_CORAL_AUDIO = "/audio/stories/practica-coral-soccery-jersey.mp3";

function loadWordTimestamps(): WordTimestamp[] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "public/audio/stories/word-timestamps.json"),
      "utf-8"
    );
    return JSON.parse(raw) as WordTimestamp[];
  } catch {
    return [];
  }
}

export default async function StoryReader({
  data,
  allowReveal = true,
  unlockAt,
  sessionId,
  savedResponses,
  trackLookups = false,
  readerMode = "open",
}: {
  data: LoadedStory;
  allowReveal?: boolean;
  unlockAt?: string;
  sessionId?: string;
  savedResponses?: SavedComprehensionResponse[];
  trackLookups?: boolean;
  readerMode?: "classroom-live" | "classroom-review" | "open";
}) {
  const { story, pronunciationDrill } = data;

  const supabase = await createClient();
  const soundVideos = await getSoundVideos(supabase);

  let choralCompleted = false;
  if (readerMode !== "classroom-live") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: completion, error: completionError } = await supabase
        .from("choral_practice_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("story_id", story.id)
        .maybeSingle();
      if (!completionError) {
        choralCompleted = Boolean(completion);
      }
    }
  }

  const showPractice = readerMode !== "classroom-live";
  const coralAudio =
    pronunciationDrill?.coral_audio_url || FALLBACK_CORAL_AUDIO;
  const coralIpa =
    pronunciationDrill?.practica_coral_ipa ||
    (story.slug === "the-soccer-jersey" ? SOCCER_JERSEY_CORAL_IPA : "");
  const wordNotes =
    pronunciationDrill && pronunciationDrill.word_notes.length > 0
      ? pronunciationDrill.word_notes
      : story.slug === "the-soccer-jersey"
        ? SOCCER_JERSEY_WORD_NOTES
        : [];

  return (
    <SoundVideoProvider videos={soundVideos}>
      <StorySteps
        data={data}
        timestamps={loadWordTimestamps()}
        allowReveal={allowReveal}
        unlockAt={unlockAt}
        sessionId={sessionId}
        savedResponses={savedResponses}
        trackLookups={trackLookups}
        readerMode={readerMode}
        showPractice={showPractice}
        coralAudio={coralAudio}
        coralIpa={coralIpa}
        wordNotes={wordNotes}
        choralCompleted={choralCompleted}
      />
    </SoundVideoProvider>
  );
}
