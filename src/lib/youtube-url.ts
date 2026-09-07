export const YOUTUBE_URL_MAX_LENGTH = 2000;

export const YOUTUBE_URL_INVALID_MESSAGE =
  "Ese no es un link de YouTube. Pega el que YouTube te da.";

export type YoutubeUrlParse =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

function isYoutubeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube.com") ||
    host.endsWith(".youtu.be") ||
    host.endsWith(".youtube-nocookie.com")
  );
}

export function parseSessionYoutubeUrl(raw: string): YoutubeUrlParse {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.length > YOUTUBE_URL_MAX_LENGTH) {
    return { ok: false, error: YOUTUBE_URL_INVALID_MESSAGE };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: YOUTUBE_URL_INVALID_MESSAGE };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: YOUTUBE_URL_INVALID_MESSAGE };
  }
  if (!isYoutubeHost(parsed.hostname)) {
    return { ok: false, error: YOUTUBE_URL_INVALID_MESSAGE };
  }

  return { ok: true, value: parsed.toString() };
}

export function youtubeLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}
