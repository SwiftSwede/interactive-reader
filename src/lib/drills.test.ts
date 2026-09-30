import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import {
  applyResult,
  buildDeck,
  CLEAN_RECALLS_TO_GRADUATE,
  DAY_MS,
  EXERCISES_PER_CATEGORY_PER_DAY,
  LAPSE_MS,
  emptyDrillItemState,
  isCorrectAnswer,
  nextPracticeAt,
  recordDrillAttempt,
  SPACING,
  storedAnswer,
  toDrillLevel,
  type DrillItem,
  type DrillItemState,
} from "./drills";
import {
  EXPECTED_SEED_COUNTS,
  parseClozeLine,
  parseDrillMarkdown,
  parseTranslationLine,
} from "./parse-drill-content";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function deckInput(
  partial: Partial<Parameters<typeof buildDeck>[0]> &
    Pick<Parameters<typeof buildDeck>[0], "items">,
): Parameters<typeof buildDeck>[0] {
  return {
    state: new Map(),
    now: NOW,
    level: "pre_int",
    introTagId: null,
    reviewTagIds: [],
    introCompletedAtByTagId: new Map(),
    ...partial,
  };
}

function item(partial: Partial<DrillItem> & Pick<DrillItem, "id" | "tagId" | "format">): DrillItem {
  return {
    tagType: "error",
    level: "pre_int",
    content: {},
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function state(
  itemId: string,
  partial: Partial<DrillItemState> = {},
): DrillItemState {
  return {
    id: `state-${itemId}`,
    userId: "student-1",
    itemId,
    rounds: 1,
    cleanRecalls: 1,
    mcqUsed: true,
    lastPracticedAt: "2026-01-01T00:00:00.000Z",
    nextPracticeAt: "2026-01-03T00:00:00.000Z",
    status: "learning",
    graduatedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("spacing ladder is 2 days, 7 days, 14 days", () => {
  assert.deepEqual(SPACING, [2 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS]);
  assert.equal(nextPracticeAt(0, NOW).toISOString(), "2026-01-03T00:00:00.000Z");
  assert.equal(nextPracticeAt(1, NOW).toISOString(), "2026-01-08T00:00:00.000Z");
  assert.equal(nextPracticeAt(2, NOW).toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(nextPracticeAt(9, NOW).toISOString(), "2026-01-15T00:00:00.000Z");
});

test("toDrillLevel maps classroom level names", () => {
  assert.equal(toDrillLevel("pre-intermediate"), "pre_int");
  assert.equal(toDrillLevel("intermediate"), "int");
});

test("three clean recalls graduate and schedule 14 days", () => {
  let current = emptyDrillItemState("student-1", "item-1", NOW);
  current = applyResult(current, { correct: true }, NOW);
  assert.equal(current.cleanRecalls, 1);
  assert.equal(current.status, "learning");
  assert.equal(current.nextPracticeAt, "2026-01-03T00:00:00.000Z");
  assert.equal(current.mcqUsed, true);

  current = applyResult(current, { correct: true }, NOW);
  assert.equal(current.cleanRecalls, 2);
  assert.equal(current.nextPracticeAt, "2026-01-08T00:00:00.000Z");
  assert.equal(current.mcqUsed, true);

  current = applyResult(current, { correct: true }, NOW);
  assert.equal(current.cleanRecalls, CLEAN_RECALLS_TO_GRADUATE);
  assert.equal(current.status, "graduated");
  assert.equal(current.graduatedAt, NOW.toISOString());
  assert.equal(current.nextPracticeAt, "2026-01-15T00:00:00.000Z");
  assert.equal(current.rounds, 3);
});

test("a miss resets clean_recalls and reschedules tomorrow", () => {
  let current = emptyDrillItemState("student-1", "item-1", NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: false }, NOW);
  assert.equal(current.cleanRecalls, 0);
  assert.equal(current.status, "learning");
  assert.equal(current.nextPracticeAt, new Date(NOW.getTime() + LAPSE_MS).toISOString());
  assert.equal(current.rounds, 3);
  assert.equal(current.mcqUsed, true);
});

test("a miss on a graduated item stays graduated", () => {
  let current = emptyDrillItemState("student-1", "item-1", NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: false }, NOW);
  assert.equal(current.status, "graduated");
  assert.equal(current.cleanRecalls, 0);
  assert.equal(current.nextPracticeAt, new Date(NOW.getTime() + LAPSE_MS).toISOString());
  assert.ok(current.graduatedAt);
});

test("intro sitting is teach plus up to 5 unseen exercises at level", () => {
  const items: DrillItem[] = [
    item({ id: "int-cloze", tagId: "make", format: "cloze", level: "int" }),
    item({ id: "p-cloze-2", tagId: "make", format: "cloze", createdAt: "2026-01-02T00:00:00.000Z" }),
    item({ id: "p-cloze-1", tagId: "make", format: "cloze", createdAt: "2026-01-01T00:00:00.000Z" }),
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "p-tr", tagId: "make", format: "translation" }),
    item({ id: "other-teach", tagId: "age", format: "teach", level: "int" }),
    item({ id: "inactive", tagId: "make", format: "cloze", active: false }),
  ];

  const deck = buildDeck(
    deckInput({ items, introTagId: "make" }),
  );

  assert.equal(deck[0]?.id, "teach");
  assert.deepEqual(
    deck.map((row) => row.id),
    ["teach", "p-cloze-1", "p-cloze-2", "p-tr"],
  );
  assert.equal(
    deck.some((row) => row.id === "int-cloze" || row.id === "other-teach"),
    false,
  );
});

test("intro sitting caps at 5 exercises and leaves leftover unseen out", () => {
  const items: DrillItem[] = [
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    ...Array.from({ length: 6 }, (_, index) =>
      item({
        id: `c${index}`,
        tagId: "make",
        format: "cloze",
        createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
      }),
    ),
    item({ id: "tr", tagId: "make", format: "translation" }),
  ];

  const deck = buildDeck(deckInput({ items, introTagId: "make" }));

  assert.equal(deck.length, 1 + EXERCISES_PER_CATEGORY_PER_DAY);
  assert.equal(deck[0]?.id, "teach");
  assert.equal(deck.some((row) => row.id === "c5" || row.format === "translation"), false);
});

test("review mix is unseen then due, cap 5 per tag, no padding", () => {
  const items: DrillItem[] = [
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "make-due", tagId: "make", format: "cloze" }),
    item({ id: "make-later", tagId: "make", format: "cloze" }),
    item({ id: "age-due-1", tagId: "age", format: "cloze" }),
    item({ id: "age-due-2", tagId: "age", format: "translation" }),
    item({ id: "age-later", tagId: "age", format: "cloze" }),
  ];
  const completed = new Date(NOW.getTime() - 2 * DAY_MS).toISOString();
  const stateMap = new Map<string, DrillItemState>([
    ["make-due", state("make-due", { nextPracticeAt: "2025-12-31T00:00:00.000Z" })],
    ["make-later", state("make-later", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })],
    ["age-due-1", state("age-due-1", { nextPracticeAt: "2025-12-01T00:00:00.000Z" })],
    ["age-due-2", state("age-due-2", { nextPracticeAt: "2025-12-15T00:00:00.000Z" })],
    ["age-later", state("age-later", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })],
  ]);

  const deck = buildDeck(
    deckInput({
      items,
      state: stateMap,
      reviewTagIds: ["make", "age"],
      introCompletedAtByTagId: new Map([
        ["make", completed],
        ["age", completed],
      ]),
    }),
  );

  assert.deepEqual(
    deck.map((row) => row.id),
    ["make-due", "age-due-1", "age-due-2"],
  );
});

test("leftover unseen wait a day after intro before review", () => {
  const items: DrillItem[] = [
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "seen", tagId: "make", format: "cloze" }),
    item({ id: "fresh", tagId: "make", format: "cloze" }),
  ];
  const justNow = NOW.toISOString();
  const later = new Date(NOW.getTime() + DAY_MS);

  const sameDay = buildDeck(
    deckInput({
      items,
      state: new Map([["seen", state("seen", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })]]),
      reviewTagIds: ["make"],
      introCompletedAtByTagId: new Map([["make", justNow]]),
    }),
  );
  assert.deepEqual(sameDay.map((row) => row.id), []);

  const nextDay = buildDeck(
    deckInput({
      items,
      now: later,
      state: new Map([["seen", state("seen", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })]]),
      reviewTagIds: ["make"],
      introCompletedAtByTagId: new Map([["make", justNow]]),
    }),
  );
  assert.deepEqual(nextDay.map((row) => row.id), ["fresh"]);
});

test("after intro has started the teach card is not dealt again", () => {
  const items: DrillItem[] = [
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "seen", tagId: "make", format: "cloze" }),
    item({ id: "fresh", tagId: "make", format: "cloze" }),
  ];
  const stateMap = new Map<string, DrillItemState>([
    ["seen", state("seen", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })],
  ]);

  const deck = buildDeck(
    deckInput({ items, state: stateMap, introTagId: "make" }),
  );

  assert.deepEqual(
    deck.map((row) => row.id),
    ["fresh"],
  );
});

test("isCorrectAnswer ignores case, spacing, one final mark, and curly apostrophes", () => {
  const cloze = item({
    id: "c",
    tagId: "make",
    format: "cloze",
    content: { text: "I need to ___ a decision.", answer: "make" },
  });
  assert.equal(isCorrectAnswer(cloze, "make"), true);
  assert.equal(isCorrectAnswer(cloze, "  MAKE "), true);
  assert.equal(isCorrectAnswer(cloze, "make."), true);
  assert.equal(isCorrectAnswer(cloze, "makee"), false);
  assert.equal(isCorrectAnswer(cloze, "do"), false);
  assert.equal(isCorrectAnswer(cloze, ""), false);

  const question = item({
    id: "q",
    tagId: "age",
    format: "cloze",
    content: { text: "¿Cuántos años tienes?", answer: "How old are you?" },
  });
  assert.equal(isCorrectAnswer(question, "how old are you"), true);
  assert.equal(isCorrectAnswer(question, "How old  are you?"), true);
  assert.equal(isCorrectAnswer(question, "How many years do you have?"), false);
});

test("isCorrectAnswer accepts any translation alternate", () => {
  const translation = item({
    id: "t",
    tagId: "make",
    format: "translation",
    content: {
      prompt: "Ellos no hacen ejercicio.",
      answer: "They don't do exercise. / They don't exercise.",
    },
  });
  assert.equal(isCorrectAnswer(translation, "They don't exercise"), true);
  assert.equal(isCorrectAnswer(translation, "They don\u2019t do exercise."), true);
  assert.equal(isCorrectAnswer(translation, "They don't make exercise."), false);
  assert.equal(
    isCorrectAnswer(translation, "They don't do exercise. / They don't exercise."),
    false,
  );
});

test("teach and order items have no answer", () => {
  const teach = item({
    id: "h",
    tagId: "make",
    format: "teach",
    content: { hook: "En español, hacer lo hace todo." },
  });
  const order = item({ id: "o", tagId: "make", format: "order", content: { answer: "x" } });
  assert.equal(storedAnswer(teach), null);
  assert.equal(isCorrectAnswer(teach, "anything"), false);
  assert.equal(isCorrectAnswer(order, "x"), false);
});

test("cloze parser keeps commentary-only and commentary-before-MCQ shapes", () => {
  const noMcq = parseClozeLine(
    "9. **P** — I'll ___ some pancakes for breakfast. → **make** (crear desde cero — the blog's core rule in its purest form)",
  );
  assert.equal(noMcq?.answer, "make");
  assert.equal(noMcq?.mcq, null);
  assert.match(noMcq?.note ?? "", /crear desde cero/);

  const mixed = parseClozeLine(
    "10. **I** — He ___ a chair out of wood. → **made** (crear desde cero; MCQ: made / did / built)",
  );
  assert.equal(mixed?.level, "int");
  assert.deepEqual(mixed?.mcq, ["made", "did", "built"]);
  assert.equal(mixed?.note, "crear desde cero");

  const multiWord = parseClozeLine(
    '5. **I** — ¿Cuántos años tienes? Choose the correct English. → **How old are you?** (MCQ: How old are you? / How many years do you have? / What age do you have? — every distractor is a real Spanish-map transfer a student actually produces.)',
  );
  assert.equal(multiWord?.answer, "How old are you?");
  assert.deepEqual(multiWord?.mcq, [
    "How old are you?",
    "How many years do you have?",
    "What age do you have?",
  ]);
});

test("translation parser keeps slash alternates inside the answer", () => {
  const parsed = parseTranslationLine(
    "4. **I** — Ellos no hacen ejercicio. → *They don't do exercise. / They don't exercise.*",
  );
  assert.equal(parsed?.prompt, "Ellos no hacen ejercicio.");
  assert.equal(parsed?.answer, "They don't do exercise. / They don't exercise.");
  assert.equal(parsed?.note, null);
});

test("authored files parse to 3 teach + 26 cloze + 12 translation", async () => {
  const dir = path.join(process.cwd(), "docs/drill-content");
  const files = [
    "make-vs-do.md",
    "age-expression.md",
    "present-perfect.md",
  ];
  const totals = { teach: 0, cloze: 0, translation: 0 };
  for (const name of files) {
    const markdown = await readFile(path.join(dir, name), "utf8");
    const parsed = parseDrillMarkdown(markdown, name);
    totals.teach += 1;
    totals.cloze += parsed.clozes.length;
    totals.translation += parsed.translations.length;
  }
  assert.deepEqual(totals, { ...EXPECTED_SEED_COUNTS });
});

test("make-vs-do stores a make/do word bank; other files do not", async () => {
  const dir = path.join(process.cwd(), "docs/drill-content");
  const make = parseDrillMarkdown(
    await readFile(path.join(dir, "make-vs-do.md"), "utf8"),
    "make-vs-do.md",
  );
  assert.ok(make.teach.wordBank);
  assert.ok(make.teach.wordBank?.make.includes("a mistake"));
  assert.ok(make.teach.wordBank?.do.includes("homework"));

  const age = parseDrillMarkdown(
    await readFile(path.join(dir, "age-expression.md"), "utf8"),
    "age-expression.md",
  );
  assert.equal(age.teach.wordBank, null);
  assert.equal(age.tagType, "error");
  assert.equal(age.tagName, "age_expression");
});

type ScriptResponse = { data: unknown; error: { message: string } | null };

function scriptedAdmin(responses: ScriptResponse[]) {
  const events: unknown[] = [];
  const queue = [...responses];
  const take = (): ScriptResponse => {
    const next = queue.shift();
    if (!next) return { data: null, error: { message: "unexpected query" } };
    return next;
  };

  const client = {
    from(table: string) {
      if (table === "learning_events") {
        return {
          insert(payload: unknown) {
            const response = take();
            if (!response.error) events.push(payload);
            return Promise.resolve({ error: response.error });
          },
        };
      }
      return {
        select() {
          const builder = {
            eq() {
              return builder;
            },
            maybeSingle: () => Promise.resolve(take()),
            single: () => Promise.resolve(take()),
          };
          return builder;
        },
        insert() {
          return {
            select() {
              return {
                single: () => Promise.resolve(take()),
              };
            },
          };
        },
        update() {
          const builder = {
            eq() {
              return builder;
            },
            select() {
              return {
                single: () => Promise.resolve(take()),
              };
            },
          };
          return builder;
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient, events };
}

function savedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "state-1",
    user_id: "student-1",
    item_id: "item-1",
    rounds: 1,
    clean_recalls: 1,
    mcq_used: true,
    last_practiced_at: NOW.toISOString(),
    next_practice_at: "2026-01-03T00:00:00.000Z",
    status: "learning",
    graduated_at: null,
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

test("recordDrillAttempt writes drill_attempt and graduates once", async () => {
  const nearly = savedRow({
    rounds: 2,
    clean_recalls: 2,
    mcq_used: true,
    status: "learning",
    graduated_at: null,
    next_practice_at: "2026-01-08T00:00:00.000Z",
  });
  const graduated = savedRow({
    rounds: 3,
    clean_recalls: 3,
    mcq_used: true,
    status: "graduated",
    graduated_at: NOW.toISOString(),
    next_practice_at: "2026-01-15T00:00:00.000Z",
  });
  const { client, events } = scriptedAdmin([
    { data: nearly, error: null },
    { data: graduated, error: null },
    { data: null, error: null },
    { data: null, error: null },
  ]);

  const stored = await recordDrillAttempt(
    client,
    { userId: "student-1", itemId: "item-1", correct: true },
    NOW,
  );

  assert.equal(stored.status, "graduated");
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    user_id: "student-1",
    event_type: "drill_attempt",
    course_session_id: null,
    detail: { item_id: "item-1", correct: true },
  });
  assert.deepEqual(events[1], {
    user_id: "student-1",
    event_type: "drill_item_graduated",
    course_session_id: null,
    detail: { item_id: "item-1" },
  });
});

test("recordDrillAttempt does not re-fire drill_item_graduated", async () => {
  const existing = savedRow({
    rounds: 3,
    clean_recalls: 3,
    status: "graduated",
    graduated_at: "2025-12-01T00:00:00.000Z",
  });
  const saved = savedRow({
    rounds: 4,
    clean_recalls: 4,
    status: "graduated",
    graduated_at: "2025-12-01T00:00:00.000Z",
    next_practice_at: "2026-01-15T00:00:00.000Z",
  });
  const { client, events } = scriptedAdmin([
    { data: existing, error: null },
    { data: saved, error: null },
    { data: null, error: null },
  ]);

  await recordDrillAttempt(
    client,
    { userId: "student-1", itemId: "item-1", correct: true },
    NOW,
  );

  assert.equal(events.length, 1);
  assert.equal(
    (events[0] as { event_type: string }).event_type,
    "drill_attempt",
  );
});

test("a failed state write is an error", async () => {
  const { client } = scriptedAdmin([
    { data: null, error: null },
    { data: null, error: { message: "write down" } },
  ]);

  await assert.rejects(
    () =>
      recordDrillAttempt(client, {
        userId: "student-1",
        itemId: "item-1",
        correct: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "DRILL_STATE_WRITE_FAILED");
      return true;
    },
  );
});
