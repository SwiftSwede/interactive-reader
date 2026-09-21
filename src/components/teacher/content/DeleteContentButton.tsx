"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import {
  deleteCatalogAction,
  previewCatalogDeleteAction,
} from "@/app/teacher/content/actions";
import type { CatalogKind } from "@/lib/catalog-crud";

export default function DeleteContentButton({
  kind,
  id,
  title,
}: {
  kind: CatalogKind;
  id: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [studentWarning, setStudentWarning] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummary("");
    setStudentWarning(null);
    setBlocked(false);
    previewCatalogDeleteAction(kind, id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        setBlocked(true);
        return;
      }
      setSummary(result.value.summary);
      setStudentWarning(result.value.studentWarning);
      setBlocked(result.value.sessionCount > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [open, kind, id]);

  function close() {
    if (pending) return;
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex w-14 shrink-0 items-center justify-center self-stretch border-l border-paper-line text-text-secondary transition-colors duration-200 hover:bg-accent hover:text-surface focus-visible:bg-accent focus-visible:text-surface active:bg-accent-hover"
        aria-label={`Borrar ${title}`}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-sheet border border-paper-line bg-surface p-6 text-text-primary backdrop:bg-text-primary/20"
        aria-labelledby={titleId}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-headline-md text-text-primary">
            Borrar contenido
          </h2>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent disabled:opacity-60"
            aria-label="Cerrar"
            disabled={pending}
            onClick={close}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {loading ? (
          <p className="mt-2 text-body-main text-text-secondary">Revisando...</p>
        ) : (
          <>
            <p className="mt-2 text-body-main text-text-secondary">{summary}</p>
            {studentWarning ? (
              <p className="mt-2 rounded-card border border-paper-line bg-warning-bg px-4 py-3 text-sm text-warning">
                {studentWarning}
              </p>
            ) : null}
          </>
        )}
        {!loading && !blocked ? (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              const result = await deleteCatalogAction(kind, id);
              if (result && "error" in result && !result.ok) {
                setPending(false);
                setError(result.error);
                return;
              }
              router.refresh();
            }}
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-3 text-label-md font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Borrando..." : "Sí, borrar"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={close}
          className="mt-2 min-h-11 w-full text-label-sm text-text-muted underline-offset-2 hover:text-text-primary hover:underline disabled:opacity-60"
        >
          {blocked ? "Cerrar" : "No, déjalo"}
        </button>
        {error ? <p className="mt-2 text-label-sm text-error">{error}</p> : null}
      </dialog>
    </>
  );
}
