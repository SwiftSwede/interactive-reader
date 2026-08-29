import tipsFile from "./coachingTips.es-LatAm.json";
import type { WordCoaching } from "./types";

type RawTipEntry = {
  shortWhyEs?: string;
  tipEs?: string;
  practiceEs?: string;
};

type TipsMap = Record<string, RawTipEntry>;

let tipsCache: TipsMap | null = null;

function loadTips(): TipsMap {
  if (tipsCache) return tipsCache;

  const map: TipsMap = {};
  for (const [key, value] of Object.entries(tipsFile)) {
    if (key.startsWith("_")) continue;
    if (typeof value !== "object" || value === null) continue;
    const row = value as Record<string, unknown>;
    map[key] = {
      shortWhyEs: typeof row.shortWhyEs === "string" ? row.shortWhyEs : undefined,
      tipEs: typeof row.tipEs === "string" ? row.tipEs : undefined,
      practiceEs: typeof row.practiceEs === "string" ? row.practiceEs : undefined,
    };
  }

  tipsCache = map;
  return map;
}

function interpolate(template: string, word: string): string {
  return template.replace(/\$\{word\}/g, word);
}

export function getOverride(reasonCode: string, word: string): WordCoaching | null {
  const tips = loadTips();
  const entry = tips[reasonCode];
  if (!entry) return null;
  if (!entry.shortWhyEs && !entry.tipEs && !entry.practiceEs) return null;

  return {
    shortWhyEs: entry.shortWhyEs ? interpolate(entry.shortWhyEs, word) : "",
    tipEs: entry.tipEs ? interpolate(entry.tipEs, word) : "",
    practiceEs: entry.practiceEs ? interpolate(entry.practiceEs, word) : "",
  };
}
