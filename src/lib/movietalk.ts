export const MOVIE_TALK_SPEAKER_RE =
  /^([A-Za-zÁÉÍÓÚáéíóúñÑ0-9.' ]+)-/;

export type MovieTalkStepId =
  | "warmup"
  | "synopsis"
  | `scene_${number}_video`
  | `scene_${number}_dialogo`
  | "end";

export type MovieTalkStep = {
  id: MovieTalkStepId;
  label: string;
};

export type MovieTalkSceneFields = {
  sceneNumber: number;
  youtubeUrl?: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  questionStartPosition?: number | null;
  questionEndPosition?: number | null;
};

export type MovieTalkStoryFields = {
  warmupQuestion?: string | null;
  warmup_question?: string | null;
  synopsis?: string | null;
};

const CLASS_ANSWER_MAX = 500;

export function parseMovieTalkClassAnswers(
  raw: unknown
): Record<number, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next: Record<number, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > 99) continue;
    if (typeof value !== "string") continue;
    next[id] = value.slice(0, CLASS_ANSWER_MAX);
  }
  return next;
}

export function serializeMovieTalkClassAnswers(
  answers: Record<number, string>
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    next[key] = value.slice(0, CLASS_ANSWER_MAX);
  }
  return next;
}

function warmupOf(story: MovieTalkStoryFields): string {
  return (story.warmupQuestion ?? story.warmup_question ?? "").trim();
}

export function encodeMovieTalkStep(step: MovieTalkStepId): string {
  return step;
}

export function isMovieTalkStepId(value: string): value is MovieTalkStepId {
  if (value === "warmup" || value === "synopsis" || value === "end") {
    return true;
  }
  return /^scene_\d+_(video|dialogo)$/.test(value);
}

export function movieTalkStepList(
  story: MovieTalkStoryFields,
  scenes: MovieTalkSceneFields[]
): MovieTalkStep[] {
  const list: MovieTalkStep[] = [];
  if (warmupOf(story)) {
    list.push({ id: "warmup", label: "Warm-up" });
  }
  list.push({ id: "synopsis", label: "Sinopsis" });
  const ordered = [...scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
  for (const scene of ordered) {
    const n = scene.sceneNumber;
    list.push({
      id: `scene_${n}_video`,
      label: ordered.length === 1 ? "Video" : `Video ${n}`,
    });
    list.push({
      id: `scene_${n}_dialogo`,
      label: ordered.length === 1 ? "Diálogo" : `Diálogo ${n}`,
    });
  }
  list.push({ id: "end", label: "Fin" });
  return list;
}

export function decodeMovieTalkStep(
  value: string | null | undefined,
  story: MovieTalkStoryFields,
  scenes: MovieTalkSceneFields[]
): MovieTalkStepId {
  const steps = movieTalkStepList(story, scenes);
  const fallback = steps[0]?.id ?? "synopsis";
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!isMovieTalkStepId(trimmed)) return fallback;
  if (!steps.some((step) => step.id === trimmed)) return fallback;
  return trimmed;
}

export function movieTalkStepIndex(
  step: MovieTalkStepId,
  story: MovieTalkStoryFields,
  scenes: MovieTalkSceneFields[]
): number {
  const steps = movieTalkStepList(story, scenes);
  const index = steps.findIndex((row) => row.id === step);
  return index < 0 ? 0 : index;
}

export function adjacentMovieTalkStep(
  story: MovieTalkStoryFields,
  scenes: MovieTalkSceneFields[],
  current: MovieTalkStepId,
  direction: "next" | "prev"
): MovieTalkStepId {
  const steps = movieTalkStepList(story, scenes);
  if (steps.length === 0) return current;
  const index = steps.findIndex((row) => row.id === current);
  const from = index < 0 ? 0 : index;
  const next = direction === "next" ? from + 1 : from - 1;
  const clamped = Math.min(steps.length - 1, Math.max(0, next));
  return steps[clamped]?.id ?? current;
}

export function splitTranscriptScenes(bodyText: string): string[] {
  const scenes: string[] = [];
  let current: string[] = [];
  for (const line of bodyText.split("\n")) {
    if (/^\*+\s*$/.test(line.trim())) {
      const chunk = current.join("\n").trim();
      if (chunk) scenes.push(chunk);
      current = [];
      continue;
    }
    current.push(line);
  }
  const last = current.join("\n").trim();
  if (last) scenes.push(last);
  return scenes;
}

export function joinTranscriptScenes(scenes: string[]): string {
  return scenes
    .map((scene) => scene.trim())
    .filter((scene) => scene.length > 0)
    .join("\n***\n");
}

export function speakerOfLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("[")) return null;
  const match = trimmed.match(MOVIE_TALK_SPEAKER_RE);
  return match?.[1]?.trim() || null;
}

export function isMovieTalkStageDirection(line: string): boolean {
  return /^\[[^\]]*\]$/.test(line.trim());
}

export function isMovieTalkSceneBreak(line: string): boolean {
  return /^\*+\s*$/.test(line.trim());
}

/** Spoken transcript only: drop ***, [stage], and Name- prefixes. */
export function movieTalkSpokenText(body: string): string {
  return body
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      if (isMovieTalkSceneBreak(trimmed)) return [];
      if (isMovieTalkStageDirection(trimmed)) return [];
      const spoken = trimmed.replace(
        new RegExp(`${MOVIE_TALK_SPEAKER_RE.source}\\s*`),
        ""
      );
      return spoken ? [spoken] : [];
    })
    .join("\n");
}

export function movieTalkCharacters(transcripts: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const transcript of transcripts) {
    for (const line of transcript.split("\n")) {
      const speaker = speakerOfLine(line);
      if (!speaker || seen.has(speaker)) continue;
      seen.add(speaker);
      names.push(speaker);
    }
  }
  return names;
}

export function characterLinesInScene(
  sceneTranscript: string,
  character: string
): number[] {
  const indices: number[] = [];
  const lines = sceneTranscript.split("\n").filter((line) => line.trim());
  lines.forEach((line, index) => {
    if (speakerOfLine(line) === character) indices.push(index);
  });
  return indices;
}

export function movieTalkSceneQuestions<T extends { position: number }>(
  questions: T[],
  scene: MovieTalkSceneFields
): T[] {
  const start = scene.questionStartPosition;
  const end = scene.questionEndPosition;
  if (start == null || end == null) return [];
  return questions.filter((q) => q.position >= start && q.position <= end);
}

export function parseSceneStep(
  step: MovieTalkStepId
): { sceneNumber: number; kind: "video" | "dialogo" } | null {
  const match = step.match(/^scene_(\d+)_(video|dialogo)$/);
  if (!match) return null;
  return {
    sceneNumber: Number(match[1]),
    kind: match[2] as "video" | "dialogo",
  };
}
