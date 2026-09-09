import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  adjacentMusicStep,
  allLyricBlanksFilled,
  decodeMusicStep,
  musicStepList,
  normalizeBlankAnswer,
  parseSongClassAnswers,
  placeLyricBlanks,
  scoreBlank,
  seekBackSeconds,
} from "./music";

const SUMMER_BODY = `I got my first real six-string
Bought it at the five-and-dime
Played it 'til my fingers bled
Was the summer of '69

Me and some guys from school
Had a band and we tried real hard
Jimmy quit, Jody got married
I should've known we'd never get far

Oh, when I look back now
That summer seemed to last forever
And if I had the choice
Yeah, I'd always wanna be there
Those were the best days of my life

Ain't no use in complainin'
When you've got a job to do
Spent my evenings down at the drive-in
And that's when I met you, yeah

Standin' on your mama's porch
You told me that you'd wait forever
Oh, and when you held my hand
I knew that it was now or never
Those were the best days of my life

Oh, yeah.
Back in the summer of '69

Man we were killin' time
We were young and restless
We needed to unwind
I guess nothin' can last forever, forever, no

And now the times are changin'
Look at everything that's come and gone
Sometimes when I play that old six-string
I think about you, wonder what went wrong
Standin' on your mama's porch
You told me that it'd last forever
Oh, and when you held my hand
I knew that it was now or never
Those were the best days of my life`;

const SUMMER_BLANKS = [
  { id: 1, prompt: "Played it 'til my fingers ____", answer: "bled" },
  { id: 2, prompt: "Jimmy ____, Jody got married", answer: "quit" },
  { id: 3, prompt: "I should've known we'd never get ___", answer: "far" },
  { id: 4, prompt: "That summer seemed to ____ forever", answer: "last" },
  { id: 5, prompt: "Ain't no use in _________'", answer: "complainin'" },
  { id: 6, prompt: "And that's when I ___ you", answer: "met" },
  { id: 7, prompt: "Oh, and when you ____ my hand", answer: "held" },
  { id: 8, prompt: "We were young and ________", answer: "restless" },
  { id: 9, prompt: "Look at everything that's come and ____", answer: "gone" },
];

describe("musicStepList hiding", () => {
  test("lyrics_meaning is always present", () => {
    const steps = musicStepList({});
    assert.deepEqual(
      steps.map((s) => s.id),
      ["lyrics_meaning"]
    );
  });

  test("hides bio, listen, blanks, and karaoke when empty", () => {
    const steps = musicStepList({
      artist_bio: "  ",
      youtube_url: null,
      lyric_blanks: [],
    });
    assert.deepEqual(
      steps.map((s) => s.id),
      ["lyrics_meaning"]
    );
  });

  test("shows five steps when bio, youtube, and blanks exist", () => {
    const steps = musicStepList({
      artist_bio: "Bryan Adams grew up in Ontario.",
      youtube_url: "https://www.youtube.com/watch?v=9f06QZCVUHg",
      lyric_blanks: SUMMER_BLANKS,
    });
    assert.deepEqual(
      steps.map((s) => s.id),
      [
        "bio",
        "blind_listen",
        "blanks",
        "lyrics_meaning",
        "truquitos_karaoke",
      ]
    );
  });
});

describe("decodeMusicStep", () => {
  const story = {
    youtube_url: "https://www.youtube.com/watch?v=9f06QZCVUHg",
    lyric_blanks: SUMMER_BLANKS,
  };

  test("falls back to the first step when unknown", () => {
    assert.equal(decodeMusicStep("nope", story), "blind_listen");
  });

  test("falls back when the step is hidden for this song", () => {
    assert.equal(decodeMusicStep("bio", story), "blind_listen");
  });

  test("maps the old video step onto Primera escucha", () => {
    assert.equal(decodeMusicStep("video", story), "blind_listen");
  });

  test("returns a known visible step", () => {
    assert.equal(decodeMusicStep("blanks", story), "blanks");
  });
});

describe("adjacentMusicStep", () => {
  const story = {
    youtube_url: "https://youtu.be/x",
    lyric_blanks: SUMMER_BLANKS,
  };

  test("advances and stops at the ends", () => {
    assert.equal(adjacentMusicStep(story, "blind_listen", "next"), "blanks");
    assert.equal(
      adjacentMusicStep(story, "blind_listen", "prev"),
      "blind_listen"
    );
    assert.equal(
      adjacentMusicStep(story, "truquitos_karaoke", "next"),
      "truquitos_karaoke"
    );
  });
});

describe("scoreBlank", () => {
  test("ignores case and extra whitespace", () => {
    assert.equal(scoreBlank("  Bled ", "bled"), true);
    assert.equal(scoreBlank("the   way you  do", "the way you do"), true);
  });

  test("keeps apostrophes", () => {
    assert.equal(scoreBlank("complainin'", "complainin'"), true);
    assert.equal(scoreBlank("complaining", "complainin'"), false);
    assert.equal(scoreBlank("complainin", "complainin'"), false);
  });

  test("empty is incorrect", () => {
    assert.equal(scoreBlank("", "bled"), false);
    assert.equal(scoreBlank("   ", "bled"), false);
  });
});

describe("normalizeBlankAnswer", () => {
  test("collapses inner whitespace", () => {
    assert.equal(normalizeBlankAnswer("  The  Way "), "the way");
  });
});

describe("placeLyricBlanks", () => {
  const placed = placeLyricBlanks(SUMMER_BODY, SUMMER_BLANKS);

  function blanksOn(lineIndex: number) {
    const line = placed.find((row) => row.lineIndex === lineIndex);
    return (line?.segments ?? [])
      .filter((seg) => seg.kind === "blank")
      .map((seg) => (seg.kind === "blank" ? seg.blankId : null));
  }

  test("places numbered blanks on the prompt lines", () => {
    assert.deepEqual(blanksOn(2), [1]);
    assert.deepEqual(blanksOn(6), [2]);
    assert.deepEqual(blanksOn(7), [3]);
    assert.deepEqual(blanksOn(9), [4]);
    assert.deepEqual(blanksOn(13), [5]);
  });

  test("reuses blank 7 on both held lines and does not blank later last", () => {
    const held = placed.filter((line) =>
      line.segments.some((seg) => seg.kind === "blank" && seg.blankId === 7)
    );
    assert.equal(held.length, 2);
    const lastForever = placed.filter((line) =>
      line.segments.some(
        (seg) =>
          seg.kind === "text" &&
          /it'd last forever/i.test(seg.text)
      )
    );
    assert.equal(
      lastForever.some((line) =>
        line.segments.some((seg) => seg.kind === "blank")
      ),
      false
    );
  });

  test("keeps stanza breaks as empty lines", () => {
    assert.equal(
      placed.some((line) => line.lineIndex === null && line.segments.length === 0),
      true
    );
  });

  test("multi-word answers become one wider blank", () => {
    const body = "I like the way you do that\nHello";
    const lines = placeLyricBlanks(body, [
      { id: 6, prompt: "I like ___ ___ ___ __ that", answer: "the way you do" },
    ]);
    const first = lines[0];
    const blanks = (first?.segments ?? []).filter((seg) => seg.kind === "blank");
    assert.equal(blanks.length, 1);
    assert.equal(blanks[0]?.kind === "blank" ? blanks[0].blankId : null, 6);
  });
});

describe("seekBackSeconds", () => {
  test("clamps at zero", () => {
    assert.equal(seekBackSeconds(1), 0);
    assert.equal(seekBackSeconds(12), 9);
  });
});

describe("parseSongClassAnswers", () => {
  test("keeps numbered blanks and drops junk", () => {
    const parsed = parseSongClassAnswers({
      1: "bled",
      nope: "x",
      5: "complainin'",
    });
    assert.equal(parsed[1], "bled");
    assert.equal(parsed[5], "complainin'");
    assert.equal(parsed[0], undefined);
  });
});

describe("allLyricBlanksFilled", () => {
  test("requires every blank to have text", () => {
    assert.equal(allLyricBlanksFilled({ 1: "bled", 2: "  " }, [{ id: 1 }, { id: 2 }]), false);
    assert.equal(
      allLyricBlanksFilled({ 1: "bled", 2: "quit" }, [{ id: 1 }, { id: 2 }]),
      true
    );
  });
});
