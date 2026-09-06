import { Play } from "lucide-react";

export default function RecordingBanner({ youtubeUrl }: { youtubeUrl: string }) {
  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 flex items-center gap-3 rounded-card border border-paper-line bg-surface p-3 hover:bg-surface-hover"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-label-md text-text-primary">
          Ver la grabación de la clase
        </span>
        <span className="block text-[12px] text-text-muted">(YouTube)</span>
      </span>
    </a>
  );
}
