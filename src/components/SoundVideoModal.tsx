"use client";

import { useEffect, useId, useRef } from "react";
import type { SoundVideo } from "@/types";
import { getBunnyEmbedUrl } from "@/lib/bunny";

export default function SoundVideoModal({
  video,
  onClose,
}: {
  video: SoundVideo | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const embedUrl = video ? getBunnyEmbedUrl(video.bunnyVideoId) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (video) {
      if (!dialog.open) dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [video]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="sound-video-modal"
      aria-labelledby={titleId}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      {video && (
        <div className="sound-video-modal-panel">
          <div className="sound-video-modal-header">
            <h2 id={titleId} className="sound-video-modal-title">
              {video.name}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              className="sound-video-modal-close"
              aria-label="Cerrar"
              onClick={(event) => {
                event.stopPropagation();
                dialogRef.current?.close();
              }}
            >
              Cerrar
            </button>
          </div>
          {video.description && (
            <p className="sound-video-modal-desc">{video.description}</p>
          )}
          {embedUrl ? (
            <div className="sound-video-modal-frame">
              <iframe
                src={embedUrl}
                title={`Video: ${video.name}`}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="sound-video-modal-empty">
              Todavía no tengo el video de este sonido. Vuelve pronto.
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
