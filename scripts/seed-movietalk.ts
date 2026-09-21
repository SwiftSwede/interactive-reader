// Seed Movie Talk lessons (Story.kind = "movie_talk") for Slice 64.
//
// Column ownership (ADR 012):
//   Owns: stories.slug, title, kind, level, cefr, body_text, body_html,
//         word_count, is_free, youtube_url (always null at story level),
//         synopsis, warmup_question, movie_talk_scenes rows,
//         comprehension_questions for this story.
//   Never touches: words, expressions, word_flags, line_timestamps,
//         artist_bio, song_meaning, lyrics_ipa, lyric_blanks.
//   --force still refuses when comprehension_responses exist for this
//   story's questions on a live course session.
//
//   npx tsx scripts/seed-movietalk.ts            # seeds all lessons in MOVIE_TALKS
//   npx tsx scripts/seed-movietalk.ts --slug the-holdovers
//   npx tsx scripts/seed-movietalk.ts --slug the-holdovers --force
//
// After seeding, annotate the transcript with:
//   npx tsx scripts/annotate-story.ts --slug the-holdovers
//
// The transcript body_text uses *** as scene breaks and Name-Dialogue format.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import { movieTalkCharacters, splitTranscriptScenes } from "../src/lib/movietalk";

type ComprehensionQuestion = {
  question: string;
  answer: string;
  position: number;
};

type MovieTalkSceneSeed = {
  sceneNumber: number;
  youtubeUrl: string;
  startSeconds: number | null;
  endSeconds: number | null;
  questionStartPosition: number;
  questionEndPosition: number;
};

type MovieTalk = {
  slug: string;
  title: string;
  level: "pre-intermediate" | "intermediate";
  cefr: string;
  synopsis: string;
  warmupQuestion: string | null;
  body: string;
  scenes: MovieTalkSceneSeed[];
  comprehensionQuestions: ComprehensionQuestion[];
};

export const MOVIE_TALKS: MovieTalk[] = [
  {
    slug: "the-holdovers",
    title: "The Holdovers",
    level: "intermediate",
    cefr: "B1/B2",
    synopsis:
      'From acclaimed director Alexander Payne, THE HOLDOVERS follows a curmudgeonly instructor (Paul Giamatti) at a New England prep school who is forced to remain on campus during Christmas break to babysit the handful of students with nowhere to go. Eventually he forms an unlikely bond with one of them, a damaged, brainy troublemaker (newcomer Dominic Sessa), and with the school\'s head cook, who has just lost a son in Vietnam (Da\'Vine Joy Randolph).',
    warmupQuestion: null,
    scenes: [
      {
        sceneNumber: 1,
        youtubeUrl: "https://www.youtube.com/watch?v=l5b_MD-Rd-E",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 1,
        questionEndPosition: 3,
      },
      {
        sceneNumber: 2,
        youtubeUrl: "https://www.youtube.com/watch?v=7wOotNsE2ZI",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 4,
        questionEndPosition: 6,
      },
      {
        sceneNumber: 3,
        youtubeUrl: "https://www.youtube.com/watch?v=RlSYOmy9XGs",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 7,
        questionEndPosition: 10,
      },
    ],
    body: `Hardy-Rémy Martin. Louis XIII. Christmas gift from the Board of Trustees.
Hunham-Oh, how generous of them.
Hardy-Thank you again for doing this, Hunham. I wouldn't have asked if it weren't an emergency.
Hunham-Oh, Mr. Endicott's mother, right? What a tragedy.
Hardy-It's not as though you had plans to leave campus anyway. And, of course, there's a nice little bonus in it for you.
Hunham-Well... "Non nobis solum nati sumus," I suppose. "Not for ourselves alone are we born."
Hardy-I'm guessing that's Cicero.
Hunham-Cicero, yes. Very good, Hardy. You remembered.
Hardy-There'll be just four boys holding over this year.
Hunham-Mm-hmm. Oh, yes. I know a couple of these reprobates.
Hardy-Let's be a little more elastic in our assessment, shall we? It's hard enough for them to be away from home on the holidays.
Hunham-Latitude is the last thing these boys need.
Hardy-Paul, at your core, you're an excellent teacher, but your approach to the students is rather traditional.
Hunham-This school was founded in 1797. I thought tradition was our stock in trade.
Hardy-Then let's call it hidebound.
Hunham-Ah.
Hardy-You know, unwavering, resistant to...
Hunham-Yes, yes, yes, I know what "hidebound" means. Uh, I get it. You're still angry that I failed Jordan Osgood.
Hardy-Senator Osgood was very upset when Princeton rescinded Jordan's acceptance, yes. And I've continued to have to deal with the fallout.
Hunham-Hardy, are we really supposed to let these boys just skate by as long as Daddy builds a new gymnasium?
Hardy-Of course not. That's not who we are. But we can't be ignorant to politics.
Hunham-That boy is too dumb to pour piss out of a boot. A genuine troglodyte.
Hardy-Jesus Christ, Paul. He was a legacy and the son of one of our biggest donors. Ever think his dad might be expecting a little consideration for his dollar?
Hunham-And he got it-- a first-class education for his son. Oh, come on, Hardy. As Dr. Greene used to say, "Our one true purpose is to produce young men of good character."
Hardy-I don't care what Dr. Greene used to say.
Hunham-"And we cannot sacrifice our integrity on the altar of their entitlement." I'm just trying to instill basic academic discipline. That's my job. Isn't it yours?
Hardy-It was. Until I became headmaster and saw that it's not so simple to keep the damn school afloat. I begged you, begged you to give the kid a C minus.
Hunham-No. There are instructors here who will do that. I am not one of them.
Hardy-Here's the manual and a full set of keys. Everything you need to know is in there. Your only task is to ensure the boys' absolute safety and good condition. And at least pretend to be a human being. Please. It's Christmas.
Student 1-Fuck this half-day bullshit. Where the hell is Walleye?
Kountze-He's probably jerking off in the Cobb salad.
Student 1-Why would he do that?
Kountze-Because he's Walleye. Who knows what that foul-smelling freak does?
Student 1-But you went straight to the Cobb salad. I mean, do you know something? Because I eat that Cobb salad.
Hunham-Salve, gentlemen. Your final exams. Hmm. I can tell by your faces that many of you are shocked at the outcome. I, on the other hand, am not, because I have had the misfortune of teaching you this semester. And even with my ocular limitations, I witnessed firsthand your glazed, uncomprehending expressions.
Kountze-Sir, I don't understand.
Hunham-That's glaringly apparent.
Kountze-No, it's... I can't fail this class.
Hunham-Oh, don't sell yourself short, Mr. Kountze. I truly believe that you can.
Kountze-I'm supposed to go to Cornell.
Hunham-Unlikely.
Kountze-Please, sir. My dad's going to flip out.
Hunham-All right. All right. Uh, in the spirit of the season, I suppose the most constructive way of dealing with your shortcomings is to offer a makeup exam. You'll all get a second run at this after break. Of course, it will not be the same exam. You will now be responsible for new material as well. Your grade will be an average of the two. Please open your books to chapter six. The Peloponnesian War, gentlemen. You've already met Pericles. Now prepare yourselves to meet Demosthenes.
Tully-No offense, sir, but is this really the best time to be starting a new chapter? I mean, we all appreciate the, uh, makeup exam gesture, but our families are here. You know, most teachers have already canceled class. We have chapel in 40 minutes, then we're out of here.
Hunham-Mm.
Tully-I mean, our heads are elsewhere.
Hunham-And where exactly is your head, Mr. Tully?
Tully-Um, I don't know. St. Kitts.
Hunham-Yes, indeed. I see you've brought your valise.
Tully-Spot-on, sir. It's just that it's been a really exhausting semester. Getting into new material now right before break? Honestly, it's a little absurd. Sir.
Hunham-Well, I would hate to be absurd. So let's just scuttle the whole thing, shall we, and let the original grades stand.
Tully-Uh, excuse me, sir. I think, uh, we all liked the first option better. What'd you say the guy's name was? Uh, Demosthe-who?
Hunham-Of course, I still expect you to be familiar with chapter six upon your return, so pack those textbooks, boys. And if displeased, take it up with your champion-- Mr. Tully. Dismissed.
***
Priest-Welcome, Barton students, faculty and parents. I know you're all anxious to start the holidays. I can see the boys shifting in their seats. But before we release you to your bountiful tables and the blessings of family, let us pray for those less fortunate than we. Let us remember the poor and the helpless, the cold, the hungry and the oppressed.
Kountze-Extra reading over vacation and no makeup test? Are you fucking kidding me? Nice work, anus.
Tully-Can you not talk, please? I'm trying to pray.
Kountze-You better pray I don't catch you alone, because I will full-on nut-punch you.
Tully-Tone it down. Jesus can hear you.
Priest-...and all those who know not the loving kindness of God.
Hardy-Sorry to hear about your mother, Endicott.
Endicott-What? Oh. Yes. Thank you.
Hardy-Yeah. We're all pulling for her.
Priest-...and your grace. And finally, let us pray for the soul of Curtis Lamb, Barton class of 1969. Just this year, Curtis gave his life valiantly in the service of his country. And let us once again extend our deepest condolences to one of the most cherished members of the Barton family, his mother Mary. Mary, we remember Curtis as such an outstanding and promising young man, and we know this holiday season will be especially difficult without him. Please know that we accompany you in your grief. May the all-powerful God who protected Abraham when he left his native land protect all our brave soldiers until they are delivered safely home to us. We ask this through Christ our Lord. Amen.
Congregation-Amen.
Priest-I wish you all a very Merry Christmas. Or, as the case may be, a very Happy Hanukkah.
Secretary-Angus Tully. You have a phone call.
Tully-You're telling me this now?
Judy-Sweetheart, listen. I know it's last minute, and I am... I'm absolutely heartbroken, but could you please see your way to staying at school over break just this once? Stanley has been working so hard, and-and we've had no time for a honeymoon.
Tully-You guys have been married since July. You've had all these months. Something's always come up.
Judy-I know it's a lot to ask, but you know how lonely I've been.
Tully-I've been lonely too. And what about Boston? You promised on the way we'd spend some time in Boston.
Judy-Angus, listen to me. This is our new family, okay? I know you miss your father-- I do, too-- but there's someone new in my life. It's just this once, darling. We'll be together at spring break, and we'll have the whole summer.
Tully-Fuck the summer, and fuck Stanley.
Judy-Angus.
Tully-Are you kidding me? I'm just supposed to stay here? Mom, please don't do this. Please.
Paul-I suspect that, like me, this is not how you wanted to spend your holidays, but such are the vicissitudes of life. And as Barton men, we learn to confront our challenges with heads held high and with a spirit of courage and good fellowship. Uh, in strict accordance with the dictates of the manual, of course. Mr. Tully, are you joining us as well? What happened to St. Kitts?
Tully-Something came up.
Paul-So, for the next two weeks, we will be following a standard school schedule...
Student-Sir? Uh, sir, we're on vacation.
Paul-...which means we will be taking our meals together, and you will observe regular hours of study.
Kountze-Study? Are you kidding me?
Paul-The Peloponnesian War awaits, Mr. Kountze. You and Mr. Tully. The rest of you can get a jump on the next semester. It'll pay off. You'll see.
Kountze-We're already holding over, and now we're being punished for it?
Paul-You will be afforded limited windows for recreation and supervised physical activity.
Tully-The gym's not even open yet.
Student-Yeah, they've only lacquered half the floor.
Paul-Fresh air will do you good.
Tully-It's like 15 degrees outside.
Paul-And the Romans bathed naked in the freezing Tiber. Adversity builds character, Mr. Tully. Uh, speaking of which, the school will be cutting heat to dormitories and faculty housing, so we'll all be bunking in the infirmary.
***
Paul-I have a surprise. Uh, these were a gift to me, and I would like to share them with both of you. Look at them. Look at all the festive shapes. Snowflakes and gingerbread men. A tree. A little mitten.
Angus-Mmm. May I go to the bathroom, sir?
Paul-You may.
Paul-Well, I'm trying. Mmm.
Angus-If you don't have a single room, uh, I'll take a junior suite or the equivalent. I fully understand it's the holidays, but it's kind of an emergency. Mm-hmm. Yeah, sure.
Paul-Mr. Tully, what are you doing?
Angus-Uh, no, no credit card. I'll pay cash or traveler's checks.
Paul-I didn't say you could use the phone.
Angus-Okay, I see. Is there anywhere else you could recommend? Maybe downtown or...
Paul-Was that a hotel?
Angus-None of your business.
Paul-It is absolutely my business. I'm looking after you.
Angus-Looking after me? Really? Like what? Like my warden? Like my butler? There's nobody here, okay? Just us two losers and a grieving mom. So let's cut the shit. You stay out of my way, and I'll stay out of yours.
Paul-That's a detention. You just earned yourself a detention, sir. Now, get back here!
Angus-Being here with you is already one big fucking detention!
Paul-Son of a bitch, that's another detention! Mr. Tully! I don't know what you're playing at, Mr. Tully, but you are courting disaster!
Paul-Without exercise, the body devours itself. You are careening towards suspension! Don't even think about it, Mr. Tully. You are a hair's breadth from suspension. I'll wash my hands of you, you hear me? Wash my hands. Stop right there. You know the gym is strictly off-limits. This is your Rubicon. Do not cross the Rubicon.
Angus-Alea jacta est. Oh, fuck! Ow! Jesus, Mr. Hunham! Fuck!
Angus-Hurry up! Hurry!
Paul-I am hurrying!
Paul-I was on thin ice already. If Woodrup finds out, the facts won't matter. He'll make it my fault.
Angus-It is your fault! You were supposed to be looking after me.
Paul-I told you to stop.
Angus-You said you washed your hands of me.
Paul-No, I meant it metaphorically!
Angus-Of course you meant it metaphorically. What were you going to do, actually go and wash your hands?
Paul-This is the end. They'll inform the school who will inform your parents, and then it's curtains. You're gonna get me fired.
Angus-I'm the one that might lose an arm, and all you can think about is yourself.
Nurse-If you could fill this out, please.
Angus-Excuse me. Is there any way we could skip this whole insurance thing?
Nurse-It's just standard procedure.
Angus-I understand, but look, um, we were over at Squantz Pond playing hockey, and I slipped on the ice.
Paul-Angus, what are you doing?
Angus-My mom told him not to take me, but I made him. My folks are divorced. We don't get to see each other very often. She'll be mad as a hornet if she finds out.
Nurse-Okay, that's your business,
Paul-Yeah. Protocols.
Angus-Please. I never get to see my dad. It was my fault. All mine. I don't want to get him in any trouble. I don't want her dragging you into court again. We can skip the insurance thing. We can pay cash. Right, Dad?
Doctor-So the good news is nothing's broken, but you did dislocate your shoulder pretty badly.
Angus-What does that mean?
Doctor-Well, that means that your arm has popped out of the socket. And we just need to pop it back in. I'm going to have you lie down. Nice and easy.
Angus-Is this going to hurt?
Doctor-Any more than it does now? Not if you relax. The key is just to relax as best as you can. Deep breaths. Deep breaths. On the count of three. One, two, three.
Angus-Jesus!
Paul-Barton men don't do that.
Angus-Do what?
Paul-Barton men don't lie.
Angus-Yeah, well, I had momentum.`,
    comprehensionQuestions: [
      {
        position: 1,
        question:
          "What is Hunham's reputation as a teacher?",
        answer:
          "He has a reputation of being a hardass and stickler to the rules.",
      },
      {
        position: 2,
        question:
          "Does the headmaster want Hunham to be stricter or more lenient with the students?",
        answer: "He wants him to be more lenient with the students.",
      },
      {
        position: 3,
        question: "Did the students do well or horribly on their exams?",
        answer: "They did horribly on their exams.",
      },
      {
        position: 4,
        question:
          "What bad news did Angus get from his mother?",
        answer:
          "He found out that he wasn't going to St Kitts for Christmas since his mother was going on a honeymoon with her new husband.",
      },
      {
        position: 5,
        question: "Would the holdovers be relaxing during the break?",
        answer:
          "No, they would be studying and exercising during their break.",
      },
      {
        position: 6,
        question: "Where would the holdovers be doing physical exercise?",
        answer: "They would be doing exercise outside in the cold.",
      },
      {
        position: 7,
        question:
          "What did Hunham threaten to give Angus for disobeying him?",
        answer: "He threatened to give him a detention.",
      },
      {
        position: 8,
        question: "Did Angus' threat work?",
        answer:
          "No. Angus completely disregarded it. He said being there with Hunham was already detention.",
      },
      {
        position: 9,
        question:
          "Why didn't Angus and Hunham want to fill out the form?",
        answer:
          "If they filled it out, the school and parents would be informed and they would fire Hardy.",
      },
      {
        position: 10,
        question: "What did Angus injure by jumping off the springboard?",
        answer: "He injured his shoulder.",
      },
    ],
  },
];

function tokensOf(body: string): number {
  return body
    .split("\n")
    .filter((line) => line.trim() && !/^\*+\s*$/.test(line.trim()))
    .flatMap((line) => line.split(/\s+/).filter(Boolean)).length;
}

async function liveResponsesExist(
  admin: ReturnType<typeof createAdminClient>,
  storyId: string
): Promise<boolean> {
  const { data: questions, error: qError } = await admin
    .from("comprehension_questions")
    .select("id")
    .eq("story_id", storyId);
  if (qError) {
    throw new Error(`no pude leer comprehension_questions (${qError.message})`);
  }
  const ids = (questions ?? []).map((row) => row.id);
  if (ids.length === 0) return false;

  const { data: responses, error: rError } = await admin
    .from("comprehension_responses")
    .select("id, course_session_id")
    .in("comprehension_question_id", ids)
    .not("course_session_id", "is", null);
  if (rError) {
    throw new Error(`no pude leer comprehension_responses (${rError.message})`);
  }
  const sessionIds = [
    ...new Set(
      (responses ?? [])
        .map((row) => row.course_session_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  if (sessionIds.length === 0) return false;

  const now = new Date().toISOString();
  const { count, error: sError } = await admin
    .from("course_sessions")
    .select("id", { count: "exact", head: true })
    .in("id", sessionIds)
    .is("class_ended_at", null)
    .lte("session_start_time", now)
    .gte("session_end_time", now);
  if (sError) {
    throw new Error(`no pude revisar course_sessions (${sError.message})`);
  }
  return (count ?? 0) > 0;
}

async function seedMovieTalk(
  admin: ReturnType<typeof createAdminClient>,
  mt: MovieTalk,
  force: boolean
) {
  const { data: existing } = await admin
    .from("stories")
    .select("id, body_text, youtube_url, synopsis, warmup_question")
    .eq("slug", mt.slug)
    .maybeSingle();

  if (existing?.id) {
    if (await liveResponsesExist(admin, existing.id)) {
      throw new Error(
        `${mt.slug}: hay respuestas de estudiantes en una clase en vivo. ` +
          `Ni --force las borra. Espera a que termine la clase o limpia esas respuestas a mano.`
      );
    }
    const diffs: string[] = [];
    if (existing.body_text !== mt.body) diffs.push("body_text");
    if ((existing.synopsis ?? "") !== mt.synopsis) diffs.push("synopsis");
    if ((existing.warmup_question ?? "") !== (mt.warmupQuestion ?? "")) {
      diffs.push("warmup_question");
    }
    if (existing.youtube_url) diffs.push("youtube_url");
    if (diffs.length > 0) {
      console.log(
        `${mt.slug}: DB differs from the MOVIE_TALKS entry on ${diffs.join(", ")}. ` +
          `--force overwrites the DB on purpose.`
      );
    }
    if (!force) {
      console.log(
        `${mt.slug} already exists. Upserting in place (synopsis, transcript, scenes, questions). ` +
          `Pass --force if you meant to overwrite on purpose.`
      );
    }
  }

  const { data: story, error } = await admin
    .from("stories")
    .upsert(
      {
        slug: mt.slug,
        title: mt.title,
        kind: "movie_talk",
        level: mt.level,
        cefr: mt.cefr,
        body_text: mt.body,
        body_html: mt.body,
        word_count: tokensOf(mt.body),
        is_free: false,
        youtube_url: null,
        synopsis: mt.synopsis,
        warmup_question: mt.warmupQuestion,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .maybeSingle();

  if (error || !story) {
    throw new Error(error?.message ?? `Could not save ${mt.slug}`);
  }

  await admin.from("movie_talk_scenes").delete().eq("story_id", story.id);
  for (const scene of mt.scenes) {
    const { error: sceneError } = await admin.from("movie_talk_scenes").insert({
      story_id: story.id,
      scene_number: scene.sceneNumber,
      youtube_url: scene.youtubeUrl,
      start_seconds: scene.startSeconds,
      end_seconds: scene.endSeconds,
      question_start_position: scene.questionStartPosition,
      question_end_position: scene.questionEndPosition,
    });
    if (sceneError) {
      throw new Error(
        `${mt.slug}: no pude insertar escena ${scene.sceneNumber} (${sceneError.message})`
      );
    }
  }

  await admin.from("comprehension_questions").delete().eq("story_id", story.id);
  for (const q of mt.comprehensionQuestions) {
    await admin.from("comprehension_questions").insert({
      story_id: story.id,
      position: q.position,
      question: q.question,
      answer: q.answer,
      level: "factual",
    });
  }

  await admin.from("personal_questions").delete().eq("story_id", story.id);

  const missingAnswers = mt.comprehensionQuestions.filter(
    (q) => !q.answer.trim()
  );
  if (missingAnswers.length > 0) {
    console.log(
      `${mt.slug}: ${missingAnswers.length} answers empty. AI draft is skipped in this run. Fill them in the editor.`
    );
  } else {
    console.log(`${mt.slug}: all ${mt.comprehensionQuestions.length} answers present. Skipping AI draft.`);
  }

  const scenes = splitTranscriptScenes(mt.body);
  if (scenes.length !== mt.scenes.length) {
    console.warn(
      `${mt.slug}: transcript has ${scenes.length} scene(s) but the seed lists ${mt.scenes.length} scene rows.`
    );
  }
  const characters = movieTalkCharacters(scenes);
  if (characters.includes("Paul") && characters.includes("Hunham")) {
    console.warn(
      `${mt.slug}: scene 3 calls the teacher "Paul" while scenes 1-2 call him "Hunham". ` +
        `The character band will show both chips.`
    );
  }

  console.log(
    `Seeded ${mt.slug} — ${mt.title} (${mt.level}), ${tokensOf(mt.body)} words, ` +
      `${mt.scenes.length} scenes, ${mt.comprehensionQuestions.length} questions`
  );
  console.log(`Next: npx tsx scripts/annotate-story.ts --slug ${mt.slug}`);
}

async function main() {
  const admin = createAdminClient();
  const slugArgIdx = process.argv.indexOf("--slug");
  const slugArg = slugArgIdx >= 0 ? process.argv[slugArgIdx + 1] : null;
  const force = process.argv.includes("--force");

  const items = slugArg
    ? MOVIE_TALKS.filter((m) => m.slug === slugArg)
    : MOVIE_TALKS;

  if (items.length === 0) {
    console.error(`No movie talk with slug "${slugArg}" in MOVIE_TALKS.`);
    process.exit(1);
  }

  for (const mt of items) {
    await seedMovieTalk(admin, mt, force);
  }
}

if (process.argv[1]?.includes("seed-movietalk")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
