export type YoutubeLeaderState = {
  playing: boolean;
  seconds: number;
  rate: number;
};

export function youtubeChannelName(sessionId: string): string {
  return `youtube-${sessionId}`;
}

export const YOUTUBE_TICK_EVENT = "tick";

export const YOUTUBE_DRIFT_SECONDS = 1.5;

function clockToSeconds(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const hms = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const hours = Number(hms[1] ?? 0);
    const minutes = Number(hms[2] ?? 0);
    const seconds = Number(hms[3] ?? 0);
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const colon = trimmed.match(/^(?:(\d+):)?(\d+):(\d+)$/);
  if (colon) {
    const hours = Number(colon[1] ?? 0);
    const minutes = Number(colon[2]);
    const seconds = Number(colon[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

export function youtubeEmbedId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const parts = parsed.pathname.split("/");
    const embed = parts.indexOf("embed");
    if (embed >= 0 && parts[embed + 1]) return parts[embed + 1];
  } catch {
    return null;
  }
  return null;
}

export function youtubeStartSeconds(url: string | null | undefined): number {
  if (!url) return 0;
  try {
    const parsed = new URL(url);
    const start =
      parsed.searchParams.get("start") ?? parsed.searchParams.get("t");
    if (!start) {
      const hash = parsed.hash.replace("#t=", "");
      if (hash) return clockToSeconds(hash) ?? 0;
      return 0;
    }
    return clockToSeconds(start) ?? 0;
  } catch {
    return 0;
  }
}
