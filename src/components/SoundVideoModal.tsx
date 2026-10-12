"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import type { SoundVideo } from "@/types";
import SoundVideoFrame from "./SoundVideoFrame";

export default function SoundVideoModal({
  video,
  onClose,
  explanationHref,
}: {
  video: SoundVideo | null;
  onClose: () => void;
  explanationHref?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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
          <SoundVideoFrame video={video} />
          {explanationHref ? (
            <Link
              href={explanationHref}
              className="mt-4 inline-flex min-h-11 items-center text-label-md text-text-accent hover:text-text-accent-dark"
            >
              Ver la explicación
            </Link>
          ) : null}
        </div>
      )}
    </dialog>
  );
}
