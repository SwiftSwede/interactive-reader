import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  activeWritingTimer,
  canStartAfterClassWriting,
  decodeWritingStep,
  hasWritingExampleStep,
  hasWritingText,
  isLateWritingSubmit,
  remainingMs,
  writingStepList,
  type WritingStepFields,
  type WritingTimerInput,
} from "./writing";

const sessionTimer = "2026-09-22T18:00:00.000Z";
const makeupTimer = "2026-09-22T20:00:00.000Z";
const minutes = 10;

function base(overrides: Partial<WritingTimerInput> = {}): WritingTimerInput {
  return {
    phase: "live",
    sessionTimerStartedAt: sessionTimer,
    personalStartedAt: null,
    status: "draft",
    text: "",
    minutes,
    now: new Date("2026-09-22T18:03:00.000Z").getTime(),
    ...overrides,
  };
}

describe("hasWritingText", () => {
  test("treats blank and whitespace as empty", () => {
    assert.equal(hasWritingText(""), false);
    assert.equal(hasWritingText("   "), false);
    assert.equal(hasWritingText(null), false);
  });

  test("counts real words", () => {
    assert.equal(hasWritingText("Hello there"), true);
  });
});

describe("activeWritingTimer", () => {
  test("live class uses the shared session timer", () => {
    assert.equal(activeWritingTimer(base()), sessionTimer);
    assert.equal(
      activeWritingTimer(base({ text: "I went to the store" })),
      sessionTimer
    );
  });

  test("live class with no Iniciar has no clock", () => {
    assert.equal(
      activeWritingTimer(base({ sessionTimerStartedAt: null })),
      null
    );
  });

  test("after class ignores an expired session timer for empty students", () => {
    assert.equal(
      activeWritingTimer(
        base({
          phase: "after",
          text: "",
          personalStartedAt: sessionTimer,
          now: new Date("2026-09-22T18:20:00.000Z").getTime(),
        })
      ),
      null
    );
  });

  test("after class uses a personal makeup timer while it still has time", () => {
    assert.equal(
      activeWritingTimer(
        base({
          phase: "after",
          text: "",
          personalStartedAt: makeupTimer,
          now: new Date("2026-09-22T20:02:00.000Z").getTime(),
        })
      ),
      makeupTimer
    );
  });

  test("after class with leftover class text keeps the class timer if it is still running", () => {
    assert.equal(
      activeWritingTimer(
        base({
          phase: "after",
          text: "I started in class",
          now: new Date("2026-09-22T18:04:00.000Z").getTime(),
        })
      ),
      sessionTimer
    );
  });

  test("after class with leftover class text has no clock once the class timer is done", () => {
    assert.equal(
      activeWritingTimer(
        base({
          phase: "after",
          text: "I started in class",
          now: new Date("2026-09-22T18:20:00.000Z").getTime(),
        })
      ),
      null
    );
  });

  test("corrected and submitted text have no clock", () => {
    assert.equal(
      activeWritingTimer(base({ status: "corrected", text: "Done" })),
      null
    );
    assert.equal(
      activeWritingTimer(
        base({ phase: "after", status: "submitted", text: "Done" })
      ),
      null
    );
  });
});

describe("canStartAfterClassWriting", () => {
  test("empty after-class students can tap Empezar", () => {
    assert.equal(
      canStartAfterClassWriting(
        base({
          phase: "after",
          sessionTimerStartedAt: sessionTimer,
          personalStartedAt: sessionTimer,
          now: new Date("2026-09-22T18:20:00.000Z").getTime(),
        })
      ),
      true
    );
  });

  test("blocks live class, existing text, corrected, and a running makeup", () => {
    assert.equal(canStartAfterClassWriting(base()), false);
    assert.equal(
      canStartAfterClassWriting(
        base({ phase: "after", text: "already wrote" })
      ),
      false
    );
    assert.equal(
      canStartAfterClassWriting(
        base({ phase: "after", status: "corrected", text: "" })
      ),
      false
    );
    assert.equal(
      canStartAfterClassWriting(
        base({
          phase: "after",
          personalStartedAt: makeupTimer,
          now: new Date("2026-09-22T20:02:00.000Z").getTime(),
        })
      ),
      false
    );
  });
});

describe("isLateWritingSubmit", () => {
  test("is true only after teaching end", () => {
    const end = new Date("2026-09-22T19:30:00.000Z").getTime();
    assert.equal(isLateWritingSubmit(null, end), false);
    assert.equal(isLateWritingSubmit("2026-09-22T19:00:00.000Z", end), false);
    assert.equal(isLateWritingSubmit("2026-09-22T19:31:00.000Z", end), true);
  });
});

describe("writingStepList", () => {
  const preInt: WritingStepFields = {
    level: "pre-intermediate",
    structureLesson: null,
    rubricText: null,
    exampleParagraph: null,
  };

  test("skips Ejemplo when pre-int has no example", () => {
    assert.deepEqual(
      writingStepList(preInt).map((step) => step.id),
      ["preguntas", "escribir", "revision"]
    );
    assert.equal(hasWritingExampleStep(preInt), false);
  });

  test("includes Ejemplo when pre-int has an example paragraph", () => {
    assert.deepEqual(
      writingStepList({
        ...preInt,
        exampleParagraph: "I think the city is too noisy.",
      }).map((step) => step.id),
      ["preguntas", "ejemplo", "escribir", "revision"]
    );
  });

  test("includes Ejemplo for intermediate structure or rubric even without a paragraph", () => {
    assert.equal(
      hasWritingExampleStep({
        level: "intermediate",
        structureLesson: "Intro, thesis, supports",
        rubricText: null,
        exampleParagraph: null,
      }),
      true
    );
    assert.equal(
      hasWritingExampleStep({
        level: "intermediate",
        structureLesson: null,
        rubricText: "Task response, coherence",
        exampleParagraph: null,
      }),
      true
    );
  });

  test("skips Ejemplo when intermediate has no teaching material", () => {
    assert.deepEqual(
      writingStepList({
        level: "intermediate",
        structureLesson: "  ",
        rubricText: null,
        exampleParagraph: "",
      }).map((step) => step.id),
      ["preguntas", "escribir", "revision"]
    );
  });

  test("decode falls back when Ejemplo was removed", () => {
    assert.equal(decodeWritingStep("ejemplo", preInt), "preguntas");
    assert.equal(decodeWritingStep("escribir", preInt), "escribir");
    assert.equal(decodeWritingStep("nope", preInt), "preguntas");
  });
});

describe("remainingMs", () => {
  test("counts down from start plus minutes", () => {
    const now = new Date("2026-09-22T18:03:00.000Z").getTime();
    assert.equal(remainingMs(sessionTimer, 10, now), 7 * 60 * 1000);
  });
});
