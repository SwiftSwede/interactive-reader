export const STUDENT_APP_LABEL = "Entrar a la clase";
export const TEACHER_APP_LABEL = "Abrir la clase";
export const ZOOM_LABEL = "Entrar a Zoom";

export default function JoinCard({
  appHref,
  zoomHref,
  appLabel,
  liveOnly,
  typeLabel,
  courseName,
  className = "mt-6",
}: {
  appHref: string | null;
  zoomHref: string | null;
  appLabel: string;
  liveOnly: boolean;
  typeLabel: string;
  courseName: string;
  className?: string;
}) {
  const showApp = Boolean(appHref);
  const showZoom = Boolean(zoomHref);

  if (liveOnly && !showZoom) {
    return (
      <section
        className={`rounded-card border border-paper-line bg-surface px-4 py-4 ${className}`}
      >
        <p className="text-headline-md text-text-primary">
          {typeLabel} · Entra por Zoom
        </p>
        <p className="mt-1 text-body-main text-text-secondary">
          El link está en el chat de Zoom.
        </p>
      </section>
    );
  }

  const zoomClass = showApp
    ? "flex min-h-12 items-center justify-center rounded-card border-2 border-white px-4 text-center text-label-md font-semibold text-white hover:bg-white/10"
    : "flex min-h-12 items-center justify-center rounded-card bg-white px-4 text-center text-label-md font-semibold text-accent hover:bg-accent-softer";

  return (
    <section className={`rounded-card bg-accent px-4 py-5 ${className}`}>
      {showApp ? (
        <a
          href={appHref!}
          className="flex min-h-12 items-center justify-center rounded-card bg-white px-4 text-center text-label-md font-semibold text-accent hover:bg-accent-softer"
        >
          {appLabel}
        </a>
      ) : null}
      {showZoom ? (
        <a
          href={zoomHref!}
          target="_blank"
          rel="noreferrer"
          className={`${zoomClass} ${showApp ? "mt-3" : ""}`}
        >
          {ZOOM_LABEL}
        </a>
      ) : null}
      {!showApp && !showZoom ? (
        <p className="text-center text-label-md font-semibold text-white">
          {typeLabel}
        </p>
      ) : null}
      <p className="mt-3 text-center text-label-md text-white">
        {typeLabel} · {courseName}
      </p>
    </section>
  );
}
