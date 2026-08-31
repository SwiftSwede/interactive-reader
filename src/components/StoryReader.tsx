import { createClient } from "@/lib/supabase/server";
import SoundVideoProvider from "@/components/SoundVideoProvider";
import StorySteps from "@/components/StorySteps";
import { getSoundVideos } from "@/lib/sound-videos";
import type { LoadedStory } from "@/lib/stories";
import type { SavedComprehensionResponse } from "@/components/ComprehensionQuestions";
import type { WordTimestamp } from "@/components/InteractiveStory";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadWordTimestamps(slug: string): WordTimestamp[] {
  // Per-story timestamp file: public/audio/stories/{slug}-timestamps.json
  // Falls back to empty array if the file doesn't exist (no karaoke).
  const filePath = join(
    process.cwd(),
    "public/audio/stories",
    `${slug}-timestamps.json`
  );
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as WordTimestamp[];
  } catch {
    return [];
  }
}

function resolveStoryAudioUrl(slug: string): string | null {
  // Per-story audio file: public/audio/stories/{slug}.mp3
  // Returns the public URL path if the file exists, null otherwise.
  const filePath = join(
    process.cwd(),
    "public/audio/stories",
    `${slug}.mp3`
  );
  if (existsSync(filePath)) {
    return `/audio/stories/${slug}.mp3`;
  }
  return null;
}

function resolveCoralAudioUrl(
  slug: string,
  drillCoralAudioUrl: string | null | undefined
): string {
  // 1. Use the database field if it's set
  if (drillCoralAudioUrl) return drillCoralAudioUrl;
  // 2. Check for a slug-based file: public/audio/stories/{slug}-coral.mp3
  const filePath = join(
    process.cwd(),
    "public/audio/stories",
    `${slug}-coral.mp3`
  );
  if (existsSync(filePath)) {
    return `/audio/stories/${slug}-coral.mp3`;
  }
  // 3. No coral audio available — return empty string
  return "";
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
  const storyAudioUrl = resolveStoryAudioUrl(story.slug);
  const coralAudio = resolveCoralAudioUrl(
    story.slug,
    pronunciationDrill?.coral_audio_url
  );
  const coralIpa = pronunciationDrill?.practica_coral_ipa || "";
  const wordNotes =
    pronunciationDrill && pronunciationDrill.word_notes.length > 0
      ? pronunciationDrill.word_notes
      : [];
  const coralExplanation = pronunciationDrill?.coral_explanation || null;

  return (
    <SoundVideoProvider videos={soundVideos}>
      <StorySteps
        data={data}
        timestamps={loadWordTimestamps(story.slug)}
        allowReveal={allowReveal}
        unlockAt={unlockAt}
        sessionId={sessionId}
        savedResponses={savedResponses}
        trackLookups={trackLookups}
        readerMode={readerMode}
        showPractice={showPractice}
        storyAudioUrl={storyAudioUrl}
        coralAudio={coralAudio}
        coralIpa={coralIpa}
        wordNotes={wordNotes}
        coralExplanation={coralExplanation}
        choralCompleted={choralCompleted}
      />
    </SoundVideoProvider>
  );
}
