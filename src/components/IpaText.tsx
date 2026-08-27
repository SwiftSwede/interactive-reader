"use client";

import { tokenizeIpa } from "@/lib/ipa";
import { useSoundVideos } from "./SoundVideoProvider";

export default function IpaText({
  text,
  interactive = false,
}: {
  text: string;
  interactive?: boolean;
}) {
  const { videos, openVideo } = useSoundVideos();
  if (!text) return null;

  if (!interactive) {
    return <span className="ipa-text">{text}</span>;
  }

  const tokens = tokenizeIpa(text, videos);

  return (
    <span className="ipa-text">
      {tokens.map((token, index) => {
        if (interactive && token.tappable && token.video) {
          return (
            <button
              key={`${token.text}-${index}`}
              type="button"
              className="ipa-sound"
              onClick={(event) => {
                event.stopPropagation();
                openVideo(token.video!);
              }}
              aria-label={`Ver video del sonido ${token.text}`}
            >
              {token.text}
            </button>
          );
        }

        return (
          <span key={`${token.text}-${index}`} className="ipa-plain">
            {token.text}
          </span>
        );
      })}
    </span>
  );
}
