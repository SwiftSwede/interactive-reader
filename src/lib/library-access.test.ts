import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  decideSelfPacedLesson,
  grantsFromItems,
  levelsGrantedBy,
  nextIncompleteLesson,
  selfPacedCardCopy,
  studentCanAccessSelfPacedCourse,
  type OwnedGrants,
} from "./library-access";

const emptyGrants = (): OwnedGrants => ({
  courseIds: new Set(),
  levels: new Set(),
});

describe("levelsGrantedBy", () => {
  test("each library grants only its own level", () => {
    assert.deepEqual(
      [...levelsGrantedBy(["intermediate"])],
      ["intermediate"]
    );
    assert.equal(levelsGrantedBy(["intermediate"]).has("pre-intermediate"), false);
    assert.equal(levelsGrantedBy(["intermediate"]).has("beginner"), false);
    assert.equal(levelsGrantedBy(["pre-intermediate"]).has("intermediate"), false);
    assert.equal(levelsGrantedBy(["beginner"]).has("pre-intermediate"), false);
    assert.deepEqual(
      [...levelsGrantedBy(["pronunciation"])],
      ["pronunciation"]
    );
  });
});

describe("studentCanAccessSelfPacedCourse", () => {
  test("beginner library opens a beginner course only", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["beginner"]),
    };
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "b",
        format: "self_paced",
        level: "beginner",
      }),
      true
    );
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "p",
        format: "self_paced",
        level: "pre-intermediate",
      }),
      false
    );
  });

  test("intermediate does not open pre-intermediate", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["intermediate"]),
    };
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "i",
        format: "self_paced",
        level: "intermediate",
      }),
      true
    );
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "p",
        format: "self_paced",
        level: "pre-intermediate",
      }),
      false
    );
  });

  test("pronunciation grants no course", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["pronunciation"]),
    };
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "b",
        format: "self_paced",
        level: "beginner",
      }),
      false
    );
  });

  test("a course product opens that course", () => {
    const grants = emptyGrants();
    grants.courseIds.add("course-1");
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "course-1",
        format: "self_paced",
        level: "intermediate",
      }),
      true
    );
  });

  test("a group course is never opened by a library", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["intermediate"]),
    };
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "g",
        format: "group",
        level: "intermediate",
      }),
      false
    );
  });
});

describe("grantsFromItems", () => {
  test("a bundle expands to each item", () => {
    const grants = grantsFromItems([
      { itemType: "level_library", courseId: null, level: "beginner" },
      { itemType: "course", courseId: "course-9", level: null },
      { itemType: "level_library", courseId: null, level: "pronunciation" },
    ]);
    assert.equal(grants.levels.has("beginner"), true);
    assert.equal(grants.levels.has("pronunciation"), true);
    assert.equal(grants.courseIds.has("course-9"), true);
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "b",
        format: "self_paced",
        level: "beginner",
      }),
      true
    );
    assert.equal(
      studentCanAccessSelfPacedCourse(grants, {
        id: "course-9",
        format: "self_paced",
        level: "intermediate",
      }),
      true
    );
  });
});

describe("nextIncompleteLesson", () => {
  const lessons = [
    { storyId: "a", slug: "a", position: 1 },
    { storyId: "b", slug: "b", position: 2 },
    { storyId: "c", slug: "c", position: 3 },
  ];

  test("empty progress returns the first lesson", () => {
    assert.equal(nextIncompleteLesson(lessons, [])?.storyId, "a");
  });

  test("mid progress returns the next lesson", () => {
    assert.equal(
      nextIncompleteLesson(lessons, [
        { storyId: "a", status: "completed" },
        { storyId: "b", status: "in-progress" },
      ])?.storyId,
      "b"
    );
  });

  test("all complete returns null", () => {
    assert.equal(
      nextIncompleteLesson(lessons, [
        { storyId: "a", status: "completed" },
        { storyId: "b", status: "completed" },
        { storyId: "c", status: "completed" },
      ]),
      null
    );
  });
});

describe("decideSelfPacedLesson", () => {
  const beginner = {
    courseId: "beg",
    level: "beginner",
    position: 2,
    published: true,
    priorStoryIds: ["lesson-1"],
  };

  test("a gap blocks a beginner lesson and earlier lessons stay open", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["beginner"]),
    };
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [beginner],
        grants,
        completedStoryIds: new Set(),
      }),
      "locked"
    );
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [{ ...beginner, position: 1, priorStoryIds: [] }],
        grants,
        completedStoryIds: new Set(),
      }),
      "allow"
    );
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [beginner],
        grants,
        completedStoryIds: new Set(["lesson-1"]),
      }),
      "allow"
    );
  });

  test("pre-intermediate is not blocked by order", () => {
    const grants: OwnedGrants = {
      courseIds: new Set(),
      levels: levelsGrantedBy(["pre-intermediate"]),
    };
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [
          {
            courseId: "pre",
            level: "pre-intermediate",
            position: 4,
            published: true,
            priorStoryIds: ["one", "two"],
          },
        ],
        grants,
        completedStoryIds: new Set(),
      }),
      "allow"
    );
  });

  test("no grant denies a published course", () => {
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [beginner],
        grants: emptyGrants(),
        completedStoryIds: new Set(["lesson-1"]),
      }),
      "denied"
    );
  });

  test("an unpublished membership stays closed for a student", () => {
    assert.equal(
      decideSelfPacedLesson({
        isTeacher: false,
        sessionOk: false,
        memberships: [{ ...beginner, published: false }],
        grants: emptyGrants(),
        completedStoryIds: new Set(),
      }),
      "denied"
    );
  });
});

describe("selfPacedCardCopy", () => {
  test("Continuar stays while any lesson remains", () => {
    const mid = selfPacedCardCopy(3, 12);
    assert.equal(mid.showContinue, true);
    assert.equal(mid.finished, false);
    assert.equal(mid.meter, "3/12 lecciones");
  });

  test("Completaste el curso only when none remain", () => {
    const done = selfPacedCardCopy(12, 12);
    assert.equal(done.showContinue, false);
    assert.equal(done.finished, true);
  });

  test("an empty course is not marked finished", () => {
    const empty = selfPacedCardCopy(0, 0);
    assert.equal(empty.finished, false);
    assert.equal(empty.showContinue, false);
  });
});
