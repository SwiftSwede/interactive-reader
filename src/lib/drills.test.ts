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
  DECK_SIZE,
  emptyDrillItemState,
  nextPracticeAt,
  recordDrillAttempt,
  SPACING,
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

test("a miss resets clean_recalls and reschedules at 2 days", () => {
  let current = emptyDrillItemState("student-1", "item-1", NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: true }, NOW);
  current = applyResult(current, { correct: false }, NOW);
  assert.equal(current.cleanRecalls, 0);
  assert.equal(current.status, "learning");
  assert.equal(current.nextPracticeAt, "2026-01-03T00:00:00.000Z");
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
  assert.equal(current.nextPracticeAt, "2026-01-03T00:00:00.000Z");
  assert.ok(current.graduatedAt);
});

test("session-1 focused deck puts teach first and hides int cloze from pre_int", () => {
  const items: DrillItem[] = [
    item({ id: "int-cloze", tagId: "make", format: "cloze", level: "int" }),
    item({ id: "p-cloze-2", tagId: "make", format: "cloze", createdAt: "2026-01-02T00:00:00.000Z" }),
    item({ id: "p-cloze-1", tagId: "make", format: "cloze", createdAt: "2026-01-01T00:00:00.000Z" }),
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "p-tr", tagId: "make", format: "translation" }),
    item({ id: "other-teach", tagId: "age", format: "teach", level: "int" }),
    item({ id: "inactive", tagId: "make", format: "cloze", active: false }),
  ];

  const deck = buildDeck({
    missionTagId: "make",
    items,
    state: new Map(),
    now: NOW,
    level: "pre_int",
  });

  assert.equal(deck[0]?.id, "teach");
  assert.deepEqual(
    deck.map((row) => row.id),
    ["teach", "p-cloze-1", "p-cloze-2", "p-tr"],
  );
  assert.equal(
    deck.some((row) => row.id === "int-cloze" || row.id === "other-teach"),
    false,
  );
  assert.ok(deck.length <= DECK_SIZE);
});

test("session-1 caps at DECK_SIZE after teach then cloze then translation", () => {
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

  const deck = buildDeck({
    missionTagId: "make",
    items,
    state: new Map(),
    now: NOW,
    level: "pre_int",
  });

  assert.equal(deck.length, DECK_SIZE);
  assert.equal(deck[0]?.id, "teach");
  assert.equal(deck.some((row) => row.format === "translation"), false);
});

test("session-2 mixes due mission items with oldest due repaso", () => {
  const items: DrillItem[] = [
    item({ id: "teach", tagId: "make", format: "teach", level: "int" }),
    item({ id: "mission-due", tagId: "make", format: "cloze" }),
    item({ id: "mission-later", tagId: "make", format: "cloze" }),
    item({ id: "repaso-old", tagId: "age", format: "cloze" }),
    item({ id: "repaso-new", tagId: "age", format: "translation" }),
    item({ id: "repaso-not-due", tagId: "age", format: "cloze" }),
  ];
  const stateMap = new Map<string, DrillItemState>([
    ["teach", state("teach", { status: "learning", nextPracticeAt: "2026-02-01T00:00:00.000Z" })],
    ["mission-due", state("mission-due", { nextPracticeAt: "2025-12-31T00:00:00.000Z" })],
    ["mission-later", state("mission-later", { nextPracticeAt: "2026-02-01T00:00:00.000Z" })],
    [
      "repaso-old",
      state("repaso-old", {
        status: "graduated",
        nextPracticeAt: "2025-12-01T00:00:00.000Z",
      }),
    ],
    [
      "repaso-new",
      state("repaso-new", {
        status: "graduated",
        nextPracticeAt: "2025-12-15T00:00:00.000Z",
      }),
    ],
    [
      "repaso-not-due",
      state("repaso-not-due", {
        status: "graduated",
        nextPracticeAt: "2026-02-01T00:00:00.000Z",
      }),
    ],
  ]);

  const deck = buildDeck({
    missionTagId: "make",
    items,
    state: stateMap,
    now: NOW,
    level: "pre_int",
  });

  assert.deepEqual(
    deck.map((row) => row.id),
    ["mission-due", "repaso-old", "repaso-new"],
  );
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
