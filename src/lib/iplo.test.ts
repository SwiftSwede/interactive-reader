import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { answersMatch } from "./drills";
import {
  calendarDateKey,
  clampSeek,
  courseLessonTotal,
  confirmationAfter,
  englishOnScreen,
  karaokePieces,
  lessonVocabulary,
  parseAudioScript,
  promptAnswerAt,
  promptInputAt,
  promptLeadText,
  promptQuestionText,
  savedProgressIsStale,
  scoreAttempt,
  subtitleAt,
  subtitleCues,
  IPLO_SUBTITLE_MAX_LINES,
  type IploNarration,
  type IploPromptRef,
  type IploSegment,
} from "./iplo";

test("answersMatch treats contractions as the same sentence", () => {
  assert.equal(answersMatch(["I don't know."], "I do not know"), true);
  assert.equal(answersMatch(["I do not know"], "I don't know"), true);
  assert.equal(answersMatch(["He's here."], "he is here"), true);
  assert.equal(answersMatch(["He's here."], "he has here"), true);
  assert.equal(answersMatch(["I don't know."], "I do know"), false);
  assert.equal(answersMatch(["Speak."], "  speak. "), true);
  assert.equal(answersMatch(["I don't"], "I don\u2019t"), true);
});

function prompt(index: number, expected: string[]): IploPromptRef {
  return {
    index,
    prompt: {
      t: "prompt",
      start: index,
      pauseAt: index + 1,
      end: index + 2,
      spanish: `pregunta ${index}`,
      expected,
    },
  };
}

describe("scoreAttempt", () => {
  const prompts = [
    prompt(0, ["I speak."]),
    prompt(1, ["You speak."]),
    prompt(2, ["He speaks."]),
    prompt(3, ["She speaks."]),
    prompt(4, ["We speak."]),
  ];

  test("60 percent does not flag", () => {
    const score = scoreAttempt(prompts, [
      { index: 0, given: "I speak", skipped: false },
      { index: 1, given: "You speak", skipped: false },
      { index: 2, given: "He speaks", skipped: false },
      { index: 3, given: "wrong", skipped: false },
      { index: 4, given: "nope", skipped: false },
    ]);
    assert.equal(score.full, true);
    assert.equal(score.accuracy, 0.6);
    assert.equal(score.shouldFlag, false);
    assert.equal(score.shouldClear, true);
  });

  test("under 60 percent flags", () => {
    const score = scoreAttempt(prompts, [
      { index: 0, given: "I speak", skipped: false },
      { index: 1, given: "You speak", skipped: false },
      { index: 2, given: "no", skipped: false },
      { index: 3, given: "no", skipped: false },
      { index: 4, given: "no", skipped: false },
    ]);
    assert.equal(score.shouldFlag, true);
    assert.equal(score.shouldClear, false);
    assert.equal(score.wrongPrompts.length, 3);
  });

  test("a skip is not a full round", () => {
    const score = scoreAttempt(prompts, [
      { index: 0, given: "I speak", skipped: false },
      { index: 1, given: "", skipped: true },
      { index: 2, given: "He speaks", skipped: false },
      { index: 3, given: "She speaks", skipped: false },
      { index: 4, given: "We speak", skipped: false },
    ]);
    assert.equal(score.full, false);
    assert.equal(score.shouldFlag, false);
    assert.equal(score.shouldClear, false);
  });
});

test("clampSeek stops at the next unanswered question before the first completion", () => {
  const prompts = [
    { pauseAt: 10, answered: true },
    { pauseAt: 40, answered: false },
    { pauseAt: 80, answered: false },
  ];
  assert.equal(
    clampSeek({ target: 90, current: 12, completedOnce: false, prompts }),
    40
  );
  assert.equal(
    clampSeek({ target: 5, current: 12, completedOnce: false, prompts }),
    5
  );
  assert.equal(
    clampSeek({ target: 90, current: 12, completedOnce: true, prompts }),
    90
  );
});

test("course meter stays at 23 until that many lessons exist", () => {
  assert.equal(courseLessonTotal(1, true), 23);
  assert.equal(courseLessonTotal(23, true), 23);
  assert.equal(courseLessonTotal(4, false), 4);
});

test("calendarDateKey uses the student zone", () => {
  const evening = new Date("2026-10-16T02:30:00.000Z");
  assert.equal(calendarDateKey("America/Mexico_City", evening), "2026-10-15");
  assert.equal(calendarDateKey("UTC", evening), "2026-10-16");
  assert.equal(calendarDateKey("Not/AZone", evening), "2026-10-15");
});

test("karaoke keeps the English line and drops stray Spanish tokens", () => {
  const pieces = karaokePieces(
    "Speak. Speak.",
    [
      { w: "speak", start: 1, end: 1.4 },
      { w: "otra", start: 1.5, end: 1.8 },
      { w: "speak", start: 2, end: 2.4 },
    ],
    2.1
  );
  assert.equal(pieces.map((piece) => piece.piece).join(""), "Speak. Speak.");
  assert.equal(pieces.some((piece) => piece.piece === "otra"), false);
  // cumulative: sung words stay lit, so both words are highlighted at 2.1
  assert.deepEqual(
    pieces.filter((piece) => piece.active).map((piece) => piece.piece),
    ["Speak.", "Speak."]
  );
});

test("karaoke highlights cumulatively: earlier words stay lit while later words are sung", () => {
  const pieces = karaokePieces(
    "I speak English.",
    [
      { w: "i", start: 1, end: 1.2 },
      { w: "speak", start: 1.2, end: 1.8 },
      { w: "english", start: 1.9, end: 2.6 },
    ],
    2.0
  );
  assert.deepEqual(
    pieces.filter((piece) => piece.active).map((piece) => piece.piece),
    ["I", "speak", "English."]
  );
});

test("karaoke survives apostrophe folds and script/audio divergences", () => {
  // text has curly apostrophes, transcript words had them stripped
  const pieces = karaokePieces(
    "No. She doesn\u2019t speak Spanish.",
    [
      { w: "no", start: 1, end: 1.4 },
      { w: "she", start: 1.6, end: 1.9 },
      { w: "doesnt", start: 2.0, end: 2.4 },
      { w: "speak", start: 2.5, end: 2.9 },
      { w: "spanish", start: 3.0, end: 3.5 },
    ],
    2.6
  );
  const lit = pieces.filter((p) => p.active).map((p) => p.piece.trim()).filter(Boolean).join(" ");
  assert.equal(lit, "No. She doesn\u2019t speak");
});

test("karaoke keeps highlighting after an unmatched token (Yep sung as Yeah)", () => {
  const pieces = karaokePieces(
    "Yep, we speak Spanish.",
    [
      { w: "we", start: 1, end: 1.3 },
      { w: "speak", start: 1.4, end: 1.8 },
      { w: "spanish", start: 1.9, end: 2.4 },
    ],
    2.0
  );
  // "Yep" has no timing but must not darken the rest of the line
  assert.deepEqual(
    pieces.filter((p) => p.active).map((p) => p.piece),
    ["we", "speak", "Spanish."]
  );
});

test("karaoke matches short prefixes (Do vs Does)", () => {
  const pieces = karaokePieces(
    "Do they speak?",
    [
      { w: "does", start: 1, end: 1.3 },
      { w: "they", start: 1.4, end: 1.7 },
      { w: "speak", start: 1.8, end: 2.2 },
    ],
    1.5
  );
  assert.deepEqual(
    pieces.filter((p) => p.active).map((p) => p.piece.trim()),
    ["Do", "they"]
  );
});

test("confirmationAfter is the English line that follows the question", () => {
  const segments: IploSegment[] = [
    { t: "prompt", start: 1, pauseAt: 2, end: 2.2, spanish: "¿Hablar?", expected: ["Speak."] },
    { t: "english", start: 2.2, end: 6, text: "Speak. Speak.", words: [] },
    { t: "narration", start: 6, end: 10, text: "", words: [] },
  ];
  assert.equal(confirmationAfter(segments, 0)?.text, "Speak. Speak.");
  assert.equal(confirmationAfter(segments, 0)?.end, 6);
  assert.equal(confirmationAfter(segments, 2), null);
});

test("englishOnScreen keeps the last English sentence up while the teacher narrates", () => {
  const segments: IploSegment[] = [
    { t: "narration", start: 0, end: 10, text: "Escucha.", words: [] },
    { t: "english", start: 10, end: 12, text: "I speak English.", words: [] },
    { t: "narration", start: 12, end: 20, text: "Ahora escucha.", words: [] },
    { t: "english", start: 20, end: 22, text: "He speaks Spanish.", words: [] },
    { t: "prompt", start: 22, end: 24, pauseAt: 23, spanish: "¿Cómo se dice?", expected: ["He speaks Spanish."] },
  ];
  // teaching replaces the dialogue line as soon as the narration starts
  assert.equal(englishOnScreen(segments, 15)?.kind, "narration");
  assert.equal(englishOnScreen(segments, 15)?.segment.text, "Ahora escucha.");
  // the next English sentence replaces it
  assert.equal(englishOnScreen(segments, 21)?.segment.text, "He speaks Spanish.");
  // a prompt clears the screen (no free answers)
  assert.equal(englishOnScreen(segments, 23), null);
  // before any English, the Spanish narration is on screen
  assert.equal(englishOnScreen(segments, 5)?.kind, "narration");
  assert.equal(englishOnScreen(segments, 5)?.segment.text, "Escucha.");
});

test("englishOnScreen shows Spanish as soon as the teaching starts", () => {
  const segments: IploSegment[] = [
    { t: "english", start: 10, end: 12, text: "I speak English.", words: [] },
    { t: "narration", start: 12, end: 40, text: "Una explicación larga.", words: [] },
  ];
  assert.equal(englishOnScreen(segments, 12)?.kind, "narration");
  assert.equal(englishOnScreen(segments, 12)?.segment.text, "Una explicación larga.");
});

test("parseAudioScript keeps narration text and words", () => {
  const script = parseAudioScript({
    audioUrl: "/audio/iplo/day-1.mp3",
    grammarTagId: "tag",
    durationSeconds: 12,
    seedVersion: "2026-10-15T20:00:00.000Z",
    segments: [
      {
        t: "narration",
        start: 0,
        end: 2,
        lines: ["Escucha la siguiente conversación."],
        words: [{ w: "escucha", start: 0.1, end: 0.4 }],
      },
    ],
  });
  assert.equal(script?.seedVersion, "2026-10-15T20:00:00.000Z");
  const narration = script?.segments[0];
  assert.equal(narration?.t, "narration");
  if (narration?.t !== "narration") return;
  assert.equal(narration.text, "Escucha la siguiente conversación.");
  assert.equal(narration.words[0]?.w, "escucha");
  assert.equal("lines" in narration, false);
});

function narration(text: string, words: { w: string; start: number; end: number }[] = []): IploNarration {
  const end = words.at(-1)?.end ?? 10;
  return { t: "narration", start: words[0]?.start ?? 0, end, text, words };
}

function captionLines(text: string): number {
  const words = text.split(/\s+/);
  let lines = 1;
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > 34) {
      lines += 1;
      current = word;
    } else {
      current = next;
    }
  }
  return lines;
}

test("subtitle cues keep a short sentence whole and cap a lecture at three lines", () => {
  const short = subtitleCues(narration("Escucha y repite."));
  assert.equal(short.length, 1);
  assert.equal(short[0]?.text, "Escucha y repite.");

  const oneSentence = "En inglés, como el español, el presente simple se usa para hablar de hechos.";
  const kept = subtitleCues(narration(oneSentence));
  assert.equal(kept.length, 1);
  assert.ok(captionLines(kept[0].text) <= IPLO_SUBTITLE_MAX_LINES);

  const lecture =
    "En esta primera lección, aprendes cómo conjugar el verbo ‘to speak’ en el presente simple, y de eso, cómo conjugar 99% de los verbos en inglés en el presente simple. Escucha y repite después de la mujer.";
  const words = lecture.split(/\s+/).map((w, index) => ({
    w,
    start: index,
    end: index + 0.8,
  }));
  const cues = subtitleCues(narration(lecture, words));
  assert.ok(cues.length >= 3);
  for (const cue of cues) {
    assert.ok(captionLines(cue.text) <= IPLO_SUBTITLE_MAX_LINES, cue.text);
  }
  assert.match(cues[0]?.text ?? "", /^En esta primera lección/);
  assert.equal(cues.at(-1)?.text, "Escucha y repite después de la mujer.");
  const midway = subtitleAt(narration(lecture, words), 4);
  assert.ok(midway);
  assert.notEqual(midway, lecture);
});

test("karaokePieces lights an accented narration word", () => {
  const pieces = karaokePieces(
    "Escucha la siguiente conversación.",
    [{ w: "conversacion", start: 1, end: 1.4 }],
    1.2
  );
  assert.equal(pieces.find((piece) => piece.piece.startsWith("conversación"))?.active, true);
});

test("the question and the input open when the question starts, and the pause waits until it ends", () => {
  const prompt = {
    t: "prompt" as const,
    start: 98.74,
    leadEnd: 99.46,
    pauseAt: 102.41,
    end: 102.56,
    spanish: "Otra vez, ¿Cómo se dice ‘hablar’ en inglés?",
    expected: ["Speak."],
  };
  assert.equal(promptLeadText(prompt.spanish), "Otra vez");
  assert.equal(promptLeadText("Ahora di “yo hablo.”"), null);
  assert.equal(promptLeadText("¿Cómo se dice “yo hablo”?"), null);
  assert.equal(promptQuestionText(prompt.spanish), "¿Cómo se dice ‘hablar’ en inglés?");
  assert.equal(promptInputAt(prompt), 99.46);
  assert.equal(promptAnswerAt(prompt), 102.41);
  // Input opens when the question starts being said: leadEnd, else seg start.
  assert.equal(
    promptInputAt({ ...prompt, leadEnd: undefined, spanish: "¿Cómo se dice “yo hablo”?" }),
    98.74
  );
});

test("promptQuestionText strips the conversational lead on the input screen", () => {
  assert.equal(
    promptQuestionText("Otra vez, ¿Cómo se dice ‘hablar’ en inglés?"),
    "¿Cómo se dice ‘hablar’ en inglés?"
  );
  assert.equal(
    promptQuestionText("Otra vez. ¿Cómo se dice \"él habla\"?"),
    "¿Cómo se dice \"él habla\"?"
  );
  assert.equal(promptQuestionText("Ahora di “yo hablo.”"), "Ahora di “yo hablo.”");
  assert.equal(
    promptQuestionText("Ahora dime cómo decir \"yo hablo\"."),
    "Ahora dime cómo decir \"yo hablo\"."
  );
  assert.equal(promptQuestionText("Dime otra vez. ¿Cómo se dice?"), "¿Cómo se dice?");
  assert.equal(promptQuestionText("¿Cómo se dice hablar?"), "¿Cómo se dice hablar?");
  // Whisper lowercases after ¿ - normalize casing for the student
  assert.equal(promptQuestionText("¿cómo se dice hablar?"), "¿Cómo se dice hablar?");
  assert.equal(
    promptQuestionText("otra vez, ¿cómo se dice hablar?"),
    "¿Cómo se dice hablar?"
  );
  // strip the instruction too, else "Otra vez" shows twice (lead caption + card)
  assert.equal(
    promptQuestionText("Otra vez, pregunta, “¿él anda todos los días?”"),
    "¿Él anda todos los días?"
  );
  assert.equal(
    promptQuestionText("Otra vez, pregunta, “¿él anda?”."),
    "¿Él anda?"
  );
});

test("lessonVocabulary keeps first-seen words and caps at 12", () => {
  const expected = [
    "I speak.",
    "You speak.",
    "He speaks.",
    "She speaks.",
    "We speak.",
    "They speak.",
    "I speak English.",
    "You speak Spanish.",
    "He speaks English.",
    "She speaks Spanish.",
    "We speak English.",
    "They speak Spanish.",
    "I don't speak.",
    "You guys speak.",
    "Really speak.",
  ];
  const script = parseAudioScript({
    audioUrl: "/a.mp3",
    grammarTagId: "tag",
    durationSeconds: 30,
    segments: expected.map((line, index) => ({
      t: "prompt",
      start: index,
      pauseAt: index + 0.5,
      end: index + 1,
      spanish: "¿Cómo?",
      expected: [line],
    })),
  });
  assert.ok(script);
  assert.deepEqual(lessonVocabulary(script!), [
    "I",
    "speak",
    "You",
    "He",
    "speaks",
    "She",
    "We",
    "They",
    "English",
    "Spanish",
    "don't",
    "guys",
  ]);
});

test("savedProgressIsStale discards a different or missing seed version", () => {
  assert.equal(savedProgressIsStale(undefined, "2026-10-15T20:00:00.000Z"), true);
  assert.equal(savedProgressIsStale("2026-10-14T20:00:00.000Z", "2026-10-15T20:00:00.000Z"), true);
  assert.equal(savedProgressIsStale("2026-10-15T20:00:00.000Z", "2026-10-15T20:00:00.000Z"), false);
  assert.equal(savedProgressIsStale(undefined, undefined), false);
});

test("parseAudioScript joins narration lines and requires a pause", () => {
  const script = parseAudioScript({
    audioUrl: "/audio/iplo/day-1.mp3",
    grammarTagId: "tag",
    durationSeconds: 12,
    segments: [
      { t: "narration", start: 0, end: 2, lines: ["Hola"] },
      { t: "prompt", start: 2, pauseAt: 4, end: 6, spanish: "¿Cómo se dice?", expected: ["Speak."] },
    ],
  });
  assert.ok(script);
  assert.equal(script?.segments[0].t, "narration");
  assert.equal("lines" in (script?.segments[0] ?? {}), false);
  assert.equal(script?.segments[1].t === "prompt" && script.segments[1].pauseAt, 4);
});
