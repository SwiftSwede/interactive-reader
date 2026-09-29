import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import type { ContentTag, EvidenceSourceType } from "@/types";
import {
  buildWritesFromTags,
  focusTagIdsForWeakSounds,
  nextEvidenceStatus,
  recordTeacherObservation,
  tagTypesForSource,
} from "./topic-evidence";

function tag(
  tagId: string,
  tagType: ContentTag["tagType"],
  coverageLevel: ContentTag["coverageLevel"] = "introduced"
): ContentTag {
  return {
    id: `ct-${tagId}`,
    contentType: "story",
    contentId: "story-1",
    tagType,
    tagId,
    coverageLevel,
  };
}

test("an empty topic takes whatever the activity reports", () => {
  assert.equal(
    nextEvidenceStatus(null, { status: "seen", sourceType: "reading" }),
    "seen"
  );
  assert.equal(
    nextEvidenceStatus(null, {
      status: "needs_more_practice",
      sourceType: "dictation",
    }),
    "needs_more_practice"
  );
});

test("passive exposure never rewrites an existing judgement", () => {
  for (const sourceType of ["reading", "word_lookup"] as EvidenceSourceType[]) {
    assert.equal(
      nextEvidenceStatus(
        { status: "needs_more_practice" },
        { status: "seen", sourceType }
      ),
      null
    );
    assert.equal(
      nextEvidenceStatus({ status: "practiced" }, { status: "seen", sourceType }),
      null
    );
    assert.equal(
      nextEvidenceStatus({ status: "seen" }, { status: "seen", sourceType }),
      null
    );
  }
});

test("needs_more_practice is sticky: reading another story cannot clear it", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "seen", sourceType: "reading" }
    ),
    null
  );
});

test("a clean practice activity clears needs_more_practice", () => {
  for (const sourceType of [
    "comprehension",
    "dictation",
    "pronunciation",
    "writing",
    "exam",
  ] as EvidenceSourceType[]) {
    assert.equal(
      nextEvidenceStatus(
        { status: "needs_more_practice" },
        { status: "practiced", sourceType }
      ),
      "practiced",
      `${sourceType} should clear`
    );
  }
});

test("a personal response cannot clear needs_more_practice", () => {
  // One whole-sentence AI correction is too coarse to declare a specific
  // grammar topic recovered.
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "practiced", sourceType: "personal_response" }
    ),
    null
  );
});

test("a struggle from any practice activity is recorded", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "needs_more_practice", sourceType: "dictation" }
    ),
    "needs_more_practice"
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "seen" },
      { status: "needs_more_practice", sourceType: "pronunciation" }
    ),
    "needs_more_practice"
  );
});

test("a repeat struggle is not rewritten", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "needs_more_practice", sourceType: "dictation" }
    ),
    null
  );
});

test("practiced is never downgraded to seen", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "seen", sourceType: "comprehension" }
    ),
    null
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "seen" },
      { status: "practiced", sourceType: "comprehension" }
    ),
    "practiced"
  );
});

test("each activity only writes tag types it can judge", () => {
  assert.deepEqual(tagTypesForSource("dictation"), ["phonetic"]);
  assert.deepEqual(tagTypesForSource("word_lookup"), ["vocabulary"]);
  assert.deepEqual(tagTypesForSource("personal_response"), ["grammar"]);
  assert.deepEqual(tagTypesForSource("reading"), [
    "grammar",
    "vocabulary",
    "phonetic",
  ]);
});

test("dictation writes phonetic tags and ignores the rest", () => {
  const tags = [
    tag("g1", "grammar"),
    tag("v1", "vocabulary"),
    tag("p1", "phonetic"),
    tag("p2", "phonetic"),
  ];

  const writes = buildWritesFromTags({
    tags,
    sourceType: "dictation",
    positiveStatus: "practiced",
  });

  assert.deepEqual(
    writes.map((write) => write.tagId),
    ["p1", "p2"]
  );
  assert.ok(writes.every((write) => write.status === "practiced"));
});

test("focus tags get needs_more_practice while siblings stay positive", () => {
  const writes = buildWritesFromTags({
    tags: [tag("p1", "phonetic"), tag("p2", "phonetic")],
    sourceType: "pronunciation",
    positiveStatus: "practiced",
    focusTagIds: ["p2"],
  });

  assert.deepEqual(writes, [
    { tagType: "phonetic", tagId: "p1", status: "practiced" },
    { tagType: "phonetic", tagId: "p2", status: "needs_more_practice" },
  ]);
});

test("weak Azure sounds map to the story's phonetic tags only", () => {
  const tags = [tag("p-th", "phonetic"), tag("p-schwa", "phonetic")];
  const names = new Map([
    ["p-th", "th_unvoiced"],
    ["p-schwa", "schwa_reduction"],
  ]);

  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["θ"], names), ["p-th"]);
  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["ə"], names), ["p-schwa"]);

  // A weak sound the story does not teach is not claimed.
  assert.deepEqual(focusTagIdsForWeakSounds(tags, ["ŋ"], names), []);
  assert.deepEqual(focusTagIdsForWeakSounds(tags, [], names), []);
});

test("a teacher observation overwrites a machine flag", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "needs_more_practice", sourceType: "teacher_observation" }
    ),
    "needs_more_practice"
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "needs_more_practice", sourceType: "teacher_observation" }
    ),
    "needs_more_practice"
  );
});

test("a teacher observation clears a sticky flag", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "practiced", sourceType: "teacher_observation" }
    ),
    "practiced"
  );
});

test("a teacher candidate wins where a passive source would not", () => {
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "seen", sourceType: "reading" }
    ),
    null
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "needs_more_practice" },
      { status: "practiced", sourceType: "teacher_observation" }
    ),
    "practiced"
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "practiced", sourceType: "reading" }
    ),
    null
  );
  assert.equal(
    nextEvidenceStatus(
      { status: "practiced" },
      { status: "practiced", sourceType: "teacher_observation" }
    ),
    "practiced"
  );
});

test("teacher observation may judge every tag family", () => {
  assert.deepEqual(tagTypesForSource("teacher_observation"), [
    "grammar",
    "vocabulary",
    "phonetic",
    "error",
  ]);
});

type StoredEvidence = {
  user_id: string;
  tag_type: string;
  tag_id: string;
  status: string;
  source_type: string;
  source_id: string | null;
};

function observationClient(options: {
  catalogs: Record<string, Array<{ id: string; name: string }>>;
  writeError?: boolean;
}) {
  const upserts: StoredEvidence[][] = [];
  const client = {
    from(table: string) {
      const state: { name?: string } = {};
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: string) {
          if (column === "name") state.name = value;
          return builder;
        },
        in() {
          return Promise.resolve({ data: [], error: null });
        },
        maybeSingle() {
          const row = (options.catalogs[table] ?? []).find(
            (item) => item.name === state.name
          );
          return Promise.resolve({
            data: row ? { id: row.id } : null,
            error: null,
          });
        },
        upsert(rows: StoredEvidence[]) {
          upserts.push(rows);
          if (options.writeError) {
            return Promise.resolve({ error: { message: "write failed" } });
          }
          return Promise.resolve({ error: null });
        },
      };
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, upserts };
}

const CATALOGS = {
  error_tags: [{ id: "err-1", name: "preposition_partner" }],
  grammar_tags: [{ id: "gr-1", name: "present_perfect" }],
  phonetic_tags: [],
  vocabulary_tags: [],
};

test("an unknown tag name becomes note text and writes no evidence", async () => {
  const { client, upserts } = observationClient({ catalogs: CATALOGS });
  const result = await recordTeacherObservation(client, {
    studentId: "student-1",
    observations: [
      { tagType: "error", tagName: "not_a_real_tag", action: "flag" },
    ],
    note: "Lo dijo en la ronda 2.",
  });

  assert.equal(result.written, 0);
  assert.deepEqual(result.flags, []);
  assert.deepEqual(result.clears, []);
  assert.match(result.note, /Lo dijo en la ronda 2\./);
  assert.match(result.note, /No está en la lista: not_a_real_tag/);
  assert.equal(upserts.length, 0);
});

test("flag and clear write the right status and tag id", async () => {
  const { client, upserts } = observationClient({ catalogs: CATALOGS });
  const result = await recordTeacherObservation(client, {
    studentId: "student-1",
    sessionId: "session-1",
    observations: [
      { tagType: "error", tagName: "preposition_partner", action: "flag" },
      { tagType: "grammar", tagName: "present_perfect", action: "clear" },
    ],
  });

  assert.equal(result.written, 2);
  assert.deepEqual(result.flags, ["preposition_partner"]);
  assert.deepEqual(result.clears, ["present_perfect"]);
  assert.equal(result.note, "");
  assert.equal(upserts.length, 1);
  const rows = upserts[0];
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => ({
      tag_id: row.tag_id,
      status: row.status,
      source_type: row.source_type,
      source_id: row.source_id,
    })),
    [
      {
        tag_id: "err-1",
        status: "needs_more_practice",
        source_type: "teacher_observation",
        source_id: "session-1",
      },
      {
        tag_id: "gr-1",
        status: "practiced",
        source_type: "teacher_observation",
        source_id: "session-1",
      },
    ]
  );
  assert.ok(rows.every((row) => row.status !== "seen"));
});

test("the same tag is written once and the last action wins", async () => {
  const { client, upserts } = observationClient({ catalogs: CATALOGS });
  const result = await recordTeacherObservation(client, {
    studentId: "student-1",
    observations: [
      { tagType: "error", tagName: "preposition_partner", action: "flag" },
      { tagType: "error", tagName: "preposition_partner", action: "clear" },
    ],
  });

  assert.equal(result.written, 1);
  assert.deepEqual(result.flags, []);
  assert.deepEqual(result.clears, ["preposition_partner"]);
  assert.equal(upserts[0][0].status, "practiced");
  assert.equal(upserts[0][0].tag_id, "err-1");
});

test("a failed evidence write is an error", async () => {
  const { client } = observationClient({
    catalogs: CATALOGS,
    writeError: true,
  });

  await assert.rejects(
    () =>
      recordTeacherObservation(client, {
        studentId: "student-1",
        observations: [
          { tagType: "error", tagName: "preposition_partner", action: "flag" },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "EVIDENCE_WRITE_FAILED");
      return true;
    }
  );
});
