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
