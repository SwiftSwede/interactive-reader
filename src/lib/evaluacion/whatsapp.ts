import type { Outcome, Track } from "./types";

/** Short label for the WhatsApp prefill. Never the internal track id. */
const NIVEL: Record<Track, string> = {
  beginner: "A1",
  pre_int: "A2",
  int: "B1",
  upper: "B2",
};

export function nivelForShare(outcome: Outcome, track: Track): string {
  if (outcome === "top") return "avanzado";
  return NIVEL[track];
}

/** Kyle's prefill, verbatim except the level slot. Markup cannot sneak into the message. */
export function whatsappPrefill(nivel: string): string {
  const clean = nivel.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return `Hice tu evaluación y me dio ${clean}. Quiero saber más sobre el Confident Speaker's Circle`;
}

/**
 * `NEXT_PUBLIC_WHATSAPP_NUMBER` is digits only (country code, no plus).
 * Null when the number is missing, so the page does not render a dead link.
 */
export function whatsappResultUrl(nivel: string, rawNumber: string | undefined): string | null {
  const digits = (rawNumber ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappPrefill(nivel))}`;
}
