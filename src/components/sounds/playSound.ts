let current: HTMLAudioElement | null = null;

export function playSoundUrl(url: string, rate: number): Promise<void> {
  if (current) {
    current.pause();
    current = null;
  }
  const audio = new Audio(url);
  audio.playbackRate = rate;
  current = audio;
  return audio.play().then(() => undefined);
}
