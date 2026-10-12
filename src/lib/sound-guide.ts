import guideFile from "@/lib/pronunciation/latam-enus-sounds-guide.v1.json";
import type { SoundVideo } from "@/types";
import { SOUND_VIDEO_CATALOG } from "./sound-catalog";

export const SLOW_TAP_MS = 1200;

export const EXCLUDED_GUIDE_IDS = [
  "consonant_t_d_alveolar",
  "consonant_ed_endings",
  "consonant_stops_aspiration",
  "consonant_d_final_devoiced",
] as const;

export const PLACEMENT_NOTES = [
  {
    ipa: "juː",
    sectionId: "long",
    note: "Guide vowel_y_glide_initial is not in the 2021 taxonomy list. It sits in Vocales largas beside uː.",
  },
  {
    ipa: "ʊɹ",
    sectionId: "long",
    note: "Catalog ure (tour, sure) is not in the taxonomy list. It sits in Vocales largas with the other r-colored vowels.",
  },
] as const;

export const CONSONANT_INTRO =
  "Las consonantes bloquean el aire. Las vocales lo moldean. Cada grupo de abajo lo bloquea de una forma distinta.";

export const VOWEL_INTRO =
  "Un monóftongo deja la lengua quieta. Un diptongo la mueve. El español tiene 5 vocales puras. El inglés tiene 11, más 5 que se mueven. Por eso suena turbio hasta que las aprendes.";

export const CHART_HEADER = "Escucha primero. Esto no es gramática.";

export type SoundSectionId =
  | "fricatives"
  | "stops"
  | "affricates"
  | "approximants"
  | "laterals"
  | "nasals"
  | "weak"
  | "short"
  | "long"
  | "diphthongs";

export type SoundSection = {
  id: SoundSectionId;
  title: string;
  subtitle: string;
  kind: "consonant" | "vowel";
  ipas: readonly string[];
};

export const SOUND_SECTIONS: readonly SoundSection[] = [
  {
    id: "fricatives",
    title: "Fricativas",
    subtitle: "exprimiendo aire por una pequeña brecha",
    kind: "consonant",
    ipas: ["f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h"],
  },
  {
    id: "stops",
    title: "Explosivas",
    subtitle: "bloqueando el aire completamente antes de dejarlo salir",
    kind: "consonant",
    ipas: ["p", "b", "t", "d", "k", "g", "ʔ"],
  },
  {
    id: "affricates",
    title: "Africadas",
    subtitle: "combinando explosiva y fricativa juntas",
    kind: "consonant",
    ipas: ["tʃ", "dʒ"],
  },
  {
    id: "approximants",
    title: "Aproximantes",
    subtitle: "casi como vocales sin mucha obstrucción",
    kind: "consonant",
    ipas: ["w", "ɹ", "j"],
  },
  {
    id: "laterals",
    title: "Aproximantes laterales",
    subtitle: "por los lados de la lengua",
    kind: "consonant",
    ipas: ["l", "ɫ"],
  },
  {
    id: "nasals",
    title: "Nasales",
    subtitle: "soltando aire por la nariz",
    kind: "consonant",
    ipas: ["m", "n", "ŋ"],
  },
  {
    id: "weak",
    title: "Vocales débiles",
    subtitle: "",
    kind: "vowel",
    ipas: ["ə"],
  },
  {
    id: "short",
    title: "Vocales cortas",
    subtitle: "",
    kind: "vowel",
    ipas: ["ɪ", "ʊ", "ɛ", "ʌ", "ɑ", "æ"],
  },
  {
    id: "long",
    title: "Vocales largas",
    subtitle: "",
    kind: "vowel",
    ipas: ["iː", "uː", "juː", "ɝ", "ɑɹ", "ɔɹ", "ɛɹ", "ɪɹ", "ʊɹ"],
  },
  {
    id: "diphthongs",
    title: "Diptongos",
    subtitle: "",
    kind: "vowel",
    ipas: ["aɪ", "eɪ", "aʊ", "ɔɪ", "oʊ"],
  },
];

const DIAGRAM_ID_BY_IPA: Record<string, string> = {
  "iː": "vowel-i",
  "uː": "vowel-u",
  "ɪ": "vowel-ih",
  "ʊ": "vowel-uu",
  "ɛ": "vowel-e",
  ə: "vowel-schwa",
  "ʌ": "vowel-uh",
  æ: "vowel-ae",
  "ɑ": "vowel-ah",
  eɪ: "diphthong-ey",
  aɪ: "diphthong-ay",
  aʊ: "diphthong-ow",
  ɔɪ: "diphthong-oy",
  oʊ: "diphthong-oh",
};

const UNJOINED_SLUG_BY_SYMBOL: Record<string, string> = {
  e: "short-e",
  a: "short-a",
  ä: "listerine",
  ay: "ay",
  ai: "ai",
  oy: "oy",
  ow: "ow",
  ar: "ar",
  or: "or",
  air: "air",
  ear: "ear",
  ure: "ure",
  p: "p",
  b: "b",
  t: "t",
  d: "d",
  k: "k",
  g: "g",
  f: "f",
  s: "s",
  z: "z",
  sh: "sh",
  zh: "zh",
  ch: "ch",
  dy: "english-j",
  m: "m",
  n: "n",
  ng: "ng",
  l: "l",
  w: "w",
};

type GuideCoach = {
  shortWhyEs: string;
  tipEs: string;
  practiceEs: string;
};

type GuideTarget = {
  id: string;
  ipa: string;
  nameEs: string;
  likelySpanishSubstitutions: string[];
  coachEs: GuideCoach;
  examples: string[];
};

type GuideFile = {
  targets: {
    vowels: GuideTarget[];
    consonants: GuideTarget[];
  };
};

export type SoundCoach = {
  why: string;
  tip: string;
  practice: string;
  substitutions: string[];
  nameEs: string;
};

export type SoundCell = {
  slug: string;
  symbol: string;
  ipa: string;
  name: string;
  keyword: string;
  audioPath: string;
  exampleWords: string[];
  hasVideo: boolean;
  sectionId: SoundSectionId;
  diagramId: string | null;
  coach: SoundCoach | null;
  video: SoundVideo;
};

export type SoundChart = {
  sections: Array<SoundSection & { cells: SoundCell[] }>;
  cells: SoundCell[];
};

const guide = guideFile as GuideFile;

export function guideTargets(): GuideTarget[] {
  return [...guide.targets.vowels, ...guide.targets.consonants];
}

export function ipaTokens(ipa: string): string[] {
  return ipa
    .split(/[/,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function audioSlug(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function keywordAudioPath(word: string): string {
  return `/audio/sounds/${audioSlug(word)}.mp3`;
}

export function nextPlayback(
  sameSound: boolean,
  elapsedMs: number
): "normal" | "slow" {
  if (sameSound && elapsedMs >= 0 && elapsedMs <= SLOW_TAP_MS) return "slow";
  return "normal";
}

export function sectionForIpa(ipa: string): SoundSection | undefined {
  return SOUND_SECTIONS.find((section) => section.ipas.includes(ipa));
}

function matchVideo(ipa: string, videos: SoundVideo[]): SoundVideo | null {
  const hits = new Set<SoundVideo>();
  for (const token of ipaTokens(ipa)) {
    for (const video of videos) {
      if (video.ipa === token || video.ipaAliases.includes(token)) {
        hits.add(video);
      }
    }
  }
  if (hits.size !== 1) return null;
  return [...hits][0];
}

function coachFrom(target: GuideTarget): SoundCoach {
  return {
    why: target.coachEs.shortWhyEs,
    tip: target.coachEs.tipEs,
    practice: target.coachEs.practiceEs,
    substitutions: target.likelySpanishSubstitutions,
    nameEs: target.nameEs,
  };
}

export function buildSoundChart(videos: SoundVideo[] = SOUND_VIDEO_CATALOG): SoundChart {
  const bySymbol = new Map(videos.map((video) => [video.symbol, video]));
  const resolved = SOUND_VIDEO_CATALOG.map(
    (item) => bySymbol.get(item.symbol) ?? item
  );

  const guideBySymbol = new Map<string, GuideTarget>();
  for (const target of guideTargets()) {
    if ((EXCLUDED_GUIDE_IDS as readonly string[]).includes(target.id)) continue;
    const video = matchVideo(target.ipa, resolved);
    if (!video) continue;
    if (!guideBySymbol.has(video.symbol)) guideBySymbol.set(video.symbol, target);
  }

  const cells: SoundCell[] = [];
  for (const video of resolved) {
    const section = sectionForIpa(video.ipa);
    if (!section) continue;
    const joined = guideBySymbol.get(video.symbol) ?? null;
    const exampleWords = (
      joined && joined.examples.length > 0 ? joined.examples : video.examples
    )
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
    const keyword = exampleWords[0] ?? "";
    const slug = joined?.id ?? UNJOINED_SLUG_BY_SYMBOL[video.symbol];
    if (!slug) continue;
    cells.push({
      slug,
      symbol: video.symbol,
      ipa: video.ipa,
      name: video.name,
      keyword,
      audioPath: keyword ? keywordAudioPath(keyword) : "",
      exampleWords,
      hasVideo: video.bunnyVideoId.trim().length > 0,
      sectionId: section.id,
      diagramId: DIAGRAM_ID_BY_IPA[video.ipa] ?? null,
      coach: joined ? coachFrom(joined) : null,
      video,
    });
  }

  const sections = SOUND_SECTIONS.map((section) => ({
    ...section,
    cells: section.ipas
      .map((ipa) => cells.find((cell) => cell.ipa === ipa))
      .filter((cell): cell is SoundCell => cell != null),
  }));

  return { sections, cells };
}

export function soundCellBySlug(
  slug: string,
  videos: SoundVideo[] = SOUND_VIDEO_CATALOG
): SoundCell | null {
  return buildSoundChart(videos).cells.find((cell) => cell.slug === slug) ?? null;
}

export function allSoundSlugs(
  videos: SoundVideo[] = SOUND_VIDEO_CATALOG
): string[] {
  return buildSoundChart(videos).cells.map((cell) => cell.slug);
}
