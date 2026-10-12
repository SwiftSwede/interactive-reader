import type { SoundVideo } from "@/types";
import { getBunnyEmbedUrl } from "@/lib/bunny";

export const SOUND_VIDEO_PLACEHOLDER =
  "Todavía no tengo el video de este sonido. Vuelve pronto.";

export default function SoundVideoFrame({
  video,
  autoplay = true,
}: {
  video: SoundVideo;
  autoplay?: boolean;
}) {
  const embedUrl = getBunnyEmbedUrl(video.bunnyVideoId, autoplay);

  if (!embedUrl) {
    return <p className="sound-video-modal-empty">{SOUND_VIDEO_PLACEHOLDER}</p>;
  }

  return (
    <div className="sound-video-modal-frame">
      <iframe
        src={embedUrl}
        title={`Video: ${video.name}`}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
