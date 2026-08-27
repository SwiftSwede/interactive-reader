import type { SupabaseClient } from "@supabase/supabase-js";
import type { SoundVideo } from "@/types";
import { SOUND_VIDEO_CATALOG } from "./sound-catalog";

type SoundVideoRow = {
  symbol: string;
  ipa: string | null;
  ipa_aliases: string[] | null;
  name: string;
  bunny_video_id: string;
  duration_seconds: number;
  description: string;
  examples: string[] | null;
  course: string;
};

export function mapSoundVideo(row: SoundVideoRow): SoundVideo {
  return {
    symbol: row.symbol,
    ipa: row.ipa ?? "",
    ipaAliases: row.ipa_aliases ?? [],
    name: row.name,
    bunnyVideoId: row.bunny_video_id ?? "",
    durationSeconds: row.duration_seconds,
    description: row.description ?? "",
    examples: row.examples ?? [],
    course: row.course ?? "",
  };
}

export function mergeSoundVideos(fromDb: SoundVideo[]): SoundVideo[] {
  const dbBySymbol = new Map(fromDb.map((video) => [video.symbol, video]));
  const merged: SoundVideo[] = [];

  for (const fallback of SOUND_VIDEO_CATALOG) {
    const row = dbBySymbol.get(fallback.symbol);
    merged.push(
      row
        ? {
            ...fallback,
            bunnyVideoId: row.bunnyVideoId || fallback.bunnyVideoId,
            durationSeconds: row.durationSeconds || fallback.durationSeconds,
          }
        : fallback
    );
    dbBySymbol.delete(fallback.symbol);
  }

  for (const extra of dbBySymbol.values()) {
    if (extra.ipa) merged.push(extra);
  }

  return merged.filter((video) => video.ipa.length > 0);
}

export async function getSoundVideos(
  supabase: SupabaseClient
): Promise<SoundVideo[]> {
  const { data, error } = await supabase
    .from("sound_videos")
    .select(
      "symbol, ipa, ipa_aliases, name, bunny_video_id, duration_seconds, description, examples, course"
    )
    .order("name", { ascending: true });

  if (error || !data) {
    return SOUND_VIDEO_CATALOG;
  }

  return mergeSoundVideos(
    (data as SoundVideoRow[]).map(mapSoundVideo)
  );
}
