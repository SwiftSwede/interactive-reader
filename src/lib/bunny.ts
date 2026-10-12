export function getBunnyLibraryId(): string {
  return process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim() ?? "";
}

export function getBunnyEmbedUrl(videoId: string, autoplay = true): string | null {
  const libraryId = getBunnyLibraryId();
  const id = videoId.trim();
  if (!libraryId || !id) return null;
  const play = autoplay ? "true" : "false";
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${id}?autoplay=${play}`;
}
