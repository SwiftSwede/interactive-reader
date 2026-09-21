import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  contentKindLabel,
  filterContentItems,
  mintLyricBlank,
  movieTalkTranscriptMatchesScenes,
  nextStableId,
  reuseLyricBlankIds,
  storyWordCount,
  type ContentIndexItem,
} from "./content-editor";
import {
  examCountsDropped,
  examItemCounts,
  parseExamForm,
  parseFillInTranslation,
  serializeFillInTranslation,
  serializeParagraphRestructuring,
  serializeSentenceCorrection,
  serializeTranslationSentences,
  serializeVocabList,
  parseParagraphRestructuring,
  parseSentenceCorrection,
  parseTranslationSentences,
  parseVocabList,
} from "./exam";
import { parsePresentationSegments } from "./presentation";
import { joinTranscriptScenes, splitTranscriptScenes } from "./movietalk";

describe("content kind labels", () => {
  test("uses the classroom chrome names", () => {
    assert.equal(contentKindLabel("video_summary"), "Traducción");
    assert.equal(contentKindLabel("song"), "Canción");
    assert.equal(contentKindLabel("conversation"), "Conversación");
  });
});

describe("storyWordCount", () => {
  test("splits on whitespace", () => {
    assert.equal(storyWordCount("one two  three"), 3);
    assert.equal(storyWordCount("   "), 0);
  });
});

describe("lyric blank ids", () => {
  test("reuses the first id for a repeated answer", () => {
    const reused = reuseLyricBlankIds([
      { id: 1, prompt: "first", answer: "love" },
      { id: 2, prompt: "again", answer: "Love" },
      { id: 3, prompt: "other", answer: "time" },
    ]);
    assert.equal(reused[1].id, 1);
    assert.equal(reused[2].id, 3);
  });

  test("mints the next unused id", () => {
    const next = mintLyricBlank([
      { id: 1, prompt: "a", answer: "a" },
      { id: 4, prompt: "b", answer: "b" },
    ]);
    assert.equal(next.id, 5);
  });
});

describe("nextStableId", () => {
  test("does not renumber existing ids", () => {
    assert.equal(nextStableId([2, 1, 4]), 5);
    assert.equal(nextStableId([]), 1);
  });
});

describe("filterContentItems", () => {
  const items: ContentIndexItem[] = [
    {
      key: "a",
      kind: "song",
      title: "A",
      level: "intermediate",
      href: "/a",
      sortAt: "2",
    },
    {
      key: "b",
      kind: "story",
      title: "B",
      level: "pre-intermediate",
      href: "/b",
      sortAt: "1",
    },
  ];

  test("filters by kind and level", () => {
    assert.equal(filterContentItems(items, "song", "all").length, 1);
    assert.equal(filterContentItems(items, "all", "pre-intermediate").length, 1);
    assert.equal(filterContentItems(items, "all", "all").length, 2);
  });
});

describe("movie talk transcript join", () => {
  test("round-trips scene blocks", () => {
    const body = joinTranscriptScenes(["Hardy-Hi.", "Angus-Hey."]);
    assert.deepEqual(splitTranscriptScenes(body), ["Hardy-Hi.", "Angus-Hey."]);
    assert.equal(movieTalkTranscriptMatchesScenes(body, 2), true);
    assert.equal(movieTalkTranscriptMatchesScenes(body, 3), false);
  });
});

describe("exam serialize round-trip", () => {
  test("vocab", () => {
    const raw = "go | ir\nwent | fue";
    assert.equal(serializeVocabList(parseVocabList(raw)), raw);
  });

  test("fill-in slots", () => {
    const raw = "The {niño|boy} {fue|went|gone} home.";
    const parsed = parseFillInTranslation(raw);
    assert.equal(serializeFillInTranslation(parsed), raw);
  });

  test("paragraph, correction, translation", () => {
    const para = "A | First\nB | Second";
    assert.equal(
      serializeParagraphRestructuring(parseParagraphRestructuring(para)),
      para
    );
    const fix = "ok | She is here.\nfix | She are here. | She is here.";
    assert.equal(serializeSentenceCorrection(parseSentenceCorrection(fix)), fix);
    const trans =
      "Hola. | Hello. | Hi.";
    assert.equal(
      serializeTranslationSentences(parseTranslationSentences(trans)),
      trans
    );
  });

  test("blocks a count drop", () => {
    const stored = parseExamForm({
      title: "Noviembre",
      theme: "",
      vocabRaw: "a | b\nc | d\ne | f\ng | h",
      task1Raw: "The {niño|boy} ran.",
      task2Type: "sentence_correction",
      task2Raw:
        "ok | One.\nfix | Two bad. | Two good.\nok | Three.",
      task3Raw: "A | A.\nB | B.\nC | C.",
      timeLimitMinutes: 35,
    });
    assert.equal(stored.error, null);
    const thin = parseExamForm({
      title: "Noviembre",
      theme: "",
      vocabRaw: "a | b\nc | d\ne | f\ng | h",
      task1Raw: "hello",
      task2Type: "sentence_correction",
      task2Raw:
        "ok | One.\nfix | Two bad. | Two good.\nok | Three.",
      task3Raw: "A | A.\nB | B.\nC | C.",
      timeLimitMinutes: 35,
    });
    assert.ok(thin.error);
    assert.equal(
      examCountsDropped(examItemCounts(stored), {
        vocab: 4,
        fillSlots: 0,
        task2: 3,
        task3: 3,
      }),
      true
    );
  });
});

describe("presentation segment order", () => {
  test("keeps JSON array order when ids are not sequential", () => {
    const segments = parsePresentationSegments([
      {
        id: 2,
        youtube_url: "https://www.youtube.com/watch?v=aaaa",
        title: "Second first",
        vocabulary: [{ english: "Hello", spanish: "hola" }],
        comprehension_questions: [
          { id: 1, question: "Q", answer: "A" },
        ],
      },
      {
        id: 1,
        youtube_url: "https://www.youtube.com/watch?v=bbbb",
        title: "First second",
        vocabulary: [{ english: "Bye", spanish: "adios" }],
        comprehension_questions: [
          { id: 1, question: "Q2", answer: "A2" },
        ],
      },
    ]);
    assert.equal(segments[0].id, 2);
    assert.equal(segments[1].id, 1);
  });
});
