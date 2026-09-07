export const ZOOM_URL_MAX_LENGTH = 2000;

export const ZOOM_URL_INVALID_MESSAGE =
  "Ese no es un link de Zoom. Pega el que Zoom te da.";

export type ZoomUrlParse =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

function isZoomHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "zoom.us" ||
    host === "zoom.com" ||
    host.endsWith(".zoom.us") ||
    host.endsWith(".zoom.com")
  );
}

export function parseCourseZoomUrl(raw: string): ZoomUrlParse {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (trimmed.length > ZOOM_URL_MAX_LENGTH) {
    return { ok: false, error: ZOOM_URL_INVALID_MESSAGE };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: ZOOM_URL_INVALID_MESSAGE };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: ZOOM_URL_INVALID_MESSAGE };
  }
  if (!isZoomHost(parsed.hostname)) {
    return { ok: false, error: ZOOM_URL_INVALID_MESSAGE };
  }

  return { ok: true, value: parsed.toString() };
}
