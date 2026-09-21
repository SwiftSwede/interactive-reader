import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  adjacentMovieTalkStep,
  characterLinesInScene,
  decodeMovieTalkStep,
  movieTalkCharacters,
  movieTalkSceneQuestions,
  movieTalkStepList,
  parseMovieTalkClassAnswers,
  movieTalkSpokenText,
  speakerOfLine,
  splitTranscriptScenes,
} from "./movietalk";

const SCENES = [
  { sceneNumber: 1, questionStartPosition: 1, questionEndPosition: 3 },
  { sceneNumber: 2, questionStartPosition: 4, questionEndPosition: 6 },
  { sceneNumber: 3, questionStartPosition: 7, questionEndPosition: 10 },
];

describe("splitTranscriptScenes", () => {
  test("returns the whole transcript when there is no ***", () => {
    assert.deepEqual(splitTranscriptScenes("Hardy-Hello.\nHunham-Hi."), [
      "Hardy-Hello.\nHunham-Hi.",
    ]);
  });

  test("splits on *** with surrounding whitespace", () => {
    const body = "Scene one\n  ***  \nScene two";
    assert.deepEqual(splitTranscriptScenes(body), ["Scene one", "Scene two"]);
  });

  test("drops a trailing ***", () => {
    assert.deepEqual(splitTranscriptScenes("Only scene\n***\n"), ["Only scene"]);
  });

  test("drops empty scenes", () => {
    assert.deepEqual(splitTranscriptScenes("A\n***\n\n***\nB"), ["A", "B"]);
  });
});

describe("speakerOfLine", () => {
  test("matches Hardy-Rémy...", () => {
    assert.equal(speakerOfLine("Hardy-Rémy Martin. Louis XIII."), "Hardy");
  });

  test("matches Student 1-Fuck...", () => {
    assert.equal(
      speakerOfLine("Student 1-Fuck this half-day bullshit."),
      "Student 1"
    );
  });

  test("does not match Name: dialogue format", () => {
    assert.equal(speakerOfLine("Hardy: Thank you again."), null);
  });

  test("skips bracketed stage directions", () => {
    assert.equal(speakerOfLine("[Hunham looks at Mary]"), null);
  });
});

describe("movieTalkSpokenText", () => {
  test("keeps half-day after stripping Student 1-", () => {
    assert.equal(
      movieTalkSpokenText("Student 1-Fuck this half-day bullshit."),
      "Fuck this half-day bullshit."
    );
  });

  test("drops scene breaks and stage directions", () => {
    const body = "Hunham-Hello.\n***\n[Hunham looks at Mary]\nAngus-Hi.";
    assert.equal(movieTalkSpokenText(body), "Hello.\nHi.");
  });
});

describe("movieTalkCharacters", () => {
  test("dedupes in first-appearance order across scenes", () => {
    const names = movieTalkCharacters([
      "Hardy-Hi.\nHunham-Hello.",
      "Hunham-Again.\nPaul-Later.",
    ]);
    assert.deepEqual(names, ["Hardy", "Hunham", "Paul"]);
  });

  test("one scene lists only speakers who talk in that scene", () => {
    assert.deepEqual(
      movieTalkCharacters(["Doctor-Look at him.\nNurse-His feet are purple."]),
      ["Doctor", "Nurse"]
    );
  });
});

describe("characterLinesInScene", () => {
  test("returns line indices for one speaker", () => {
    const transcript = "Hardy-A.\nHunham-B.\nHardy-C.";
    assert.deepEqual(characterLinesInScene(transcript, "Hardy"), [0, 2]);
  });
});

describe("movieTalkStepList", () => {
  test("omits warmup when empty and always includes synopsis and end", () => {
    const steps = movieTalkStepList({ warmup_question: "  " }, SCENES);
    assert.deepEqual(
      steps.map((s) => s.id),
      [
        "synopsis",
        "scene_1_video",
        "scene_1_dialogo",
        "scene_2_video",
        "scene_2_dialogo",
        "scene_3_video",
        "scene_3_dialogo",
        "end",
      ]
    );
  });

  test("includes warmup when the question is set", () => {
    const steps = movieTalkStepList(
      { warmupQuestion: "What do you know about boarding school?" },
      SCENES
    );
    assert.equal(steps[0]?.id, "warmup");
  });
});

describe("decodeMovieTalkStep", () => {
  test("falls back to the first step on unknown values", () => {
    assert.equal(decodeMovieTalkStep("nope", {}, SCENES), "synopsis");
  });

  test("returns a known step", () => {
    assert.equal(
      decodeMovieTalkStep("scene_2_dialogo", {}, SCENES),
      "scene_2_dialogo"
    );
  });
});

describe("adjacentMovieTalkStep", () => {
  test("advances and stops at the ends", () => {
    assert.equal(
      adjacentMovieTalkStep({}, SCENES, "synopsis", "next"),
      "scene_1_video"
    );
    assert.equal(
      adjacentMovieTalkStep({}, SCENES, "synopsis", "prev"),
      "synopsis"
    );
    assert.equal(adjacentMovieTalkStep({}, SCENES, "end", "next"), "end");
  });
});

describe("movieTalkSceneQuestions", () => {
  test("slices by the scene range", () => {
    const questions = [1, 2, 3, 4, 5, 6, 7].map((position) => ({ position }));
    assert.deepEqual(
      movieTalkSceneQuestions(questions, SCENES[1]!).map((q) => q.position),
      [4, 5, 6]
    );
  });
});

describe("parseMovieTalkClassAnswers", () => {
  test("keeps integer keys and truncates", () => {
    const parsed = parseMovieTalkClassAnswers({
      "1": "ok",
      nope: "x",
      "0": "no",
    });
    assert.equal(parsed[1], "ok");
    assert.equal(parsed[0], undefined);
  });
});
