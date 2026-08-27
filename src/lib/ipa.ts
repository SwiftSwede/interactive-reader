import type { SoundVideo } from "@/types";

export type IpaToken = {
  text: string;
  tappable: boolean;
  video: SoundVideo | null;
};

export function catalogKeys(videos: SoundVideo[]): string[] {
  const keys = new Set<string>();
  for (const video of videos) {
    if (video.ipa) keys.add(video.ipa);
    for (const alias of video.ipaAliases) {
      if (alias) keys.add(alias);
    }
  }
  return [...keys];
}

export function videoForIpa(
  ipa: string,
  videos: SoundVideo[]
): SoundVideo | undefined {
  return videos.find(
    (video) => video.ipa === ipa || video.ipaAliases.includes(ipa)
  );
}

function longestFirst(keys: string[]): string[] {
  return [...keys].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function stripIpaSlashes(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && trimmed.endsWith("/") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function tokenizeIpa(raw: string, videos: SoundVideo[]): IpaToken[] {
  const keys = longestFirst(catalogKeys(videos));
  const body = stripIpaSlashes(raw);
  const tokens: IpaToken[] = [];
  let i = 0;

  while (i < body.length) {
    const rest = body.slice(i);
    const match = keys.find((key) => rest.startsWith(key));
    if (match) {
      const video = videoForIpa(match, videos) ?? null;
      tokens.push({
        text: match,
        tappable: video != null,
        video,
      });
      i += match.length;
      continue;
    }

    tokens.push({
      text: body[i],
      tappable: false,
      video: null,
    });
    i += 1;
  }

  return tokens;
}
