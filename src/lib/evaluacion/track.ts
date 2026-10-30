export type EvalEvent = "quiz_start" | "track_complete" | "result_shown" | "beginner_redirect";

/** Pixel stub. Event names are placeholders until Kyle names them; no network call yet. */
export function track(event: EvalEvent, data?: Record<string, string | number>): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[evaluacion track]", event, data ?? {});
  }
}
