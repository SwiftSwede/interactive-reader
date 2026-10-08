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
import {
  movieTalkCharacters,
  movieTalkSpokenText,
  MOVIE_TALK_SPEAKER_RE,
  splitTranscriptScenes,
} from "../src/lib/movietalk";

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
  {
    slug: "beetlejuice",
    title: "Beetlejuice",
    level: "intermediate",
    cefr: "B1/B2",
    synopsis: "After a recently deceased couple finds their idyllic country home occupied by an unbearable family of New York city-dwellers, they attempt to reclaim their residence by haunting the newcomers. When their amateur ghostly scare tactics prove ineffective, they turn to a crude and chaotic \"bio-exorcist\" for assistance. However, their desperate decision quickly spirals out of control, forcing the ghosts to navigate a surreal supernatural underworld to save their home and themselves from a volatile spirit who has his own dangerous agenda.",
    warmupQuestion: null,
    scenes: [
      {
        sceneNumber: 1,
        youtubeUrl: "https://www.youtube.com/watch?v=AuVxh3bRVQg",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 1,
        questionEndPosition: 3,
      },
      {
        sceneNumber: 2,
        youtubeUrl: "https://www.youtube.com/watch?v=HERc9XIFZBo",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 4,
        questionEndPosition: 6,
      },
      {
        sceneNumber: 3,
        youtubeUrl: "https://www.youtube.com/watch?v=OeEa3gTsVDo",
        startSeconds: null,
        endSeconds: null,
        questionStartPosition: 7,
        questionEndPosition: 9,
      },
    ],
    body: `Barbara-Ugh, Jane.
Adam-It's your turn, honey. Good luck.
Barbara-Thanks.
Jane-Hi, Barbara.
Barbara-Hi.
Jane-Glad I caught you. Heard you were on vacation.
Barbara-That's right. Complete vacation.
Jane-Honey, today I'm $260,000.
Barbara-No, Jane. It's 6:45 in the morning.
Jane-This offer is real. From a man in New York City who only saw a photograph.
Adam-Jane, don't send people photos of our house.
Jane-He wants to bring the wife and family up here for some peace and quiet.
Barbara-That's exactly what we're looking for.
Jane-But, Barbara, this house is too big for you. It really ought to be for a couple with a family, you know...? Oh, pumpkin, I didn't mean anything. It's just that this house is too big. I'll see you in a few weeks. Okay?
Barbara-Okay.
Jane- All right. Think about it.
Barbara-Take care.
Jane-Boo! I was just telling Barbara about this offer...
Adam-No, Jane.
Jane-Adam.
Adam-Barbara, come with me down to the store.
Barbara-What for?
Adam-I need a new brush for this tung oil. And I want to get a part for the model.
Barbara-Well, you just run in, okay?
Adam-Two weeks at home. The perfect vacation.
Barbara-Jane says we should sell the house to someone with a family.
Adam-Well, I don't think that it's any of Jane's business. Besides, we could try again on this vacation, you know.
Barbara-Oh, really? What are you saying?
Adam-How are you doing, Ernie?
Ernie-Hi, how are you?
Bill-Morning, Adam. Need a haircut before your vacation?
Adam-No, thanks, Bill.
Bill-How's the model coming?
Adam-Oh, it's great.
Bill-You know, you said Bozman built that foundation in 1835. But his grandson... He got hair right down to his goddamn shoulders. He says to me, "just trim it a little."
I took the scissors to him so fast...
Adam-See you later, huh, bill?
Bill-Right.
Barbara-This is gonna be great. Are you sure you wouldn't rather go to Jamaica or someplace like that?
Adam-No way. There's no place like home. Hey, look out for that...!
Barbara-Perfect start to our vacation.
Adam-Well, you'll feel better when you're dry, honey.
Barbara-That fire wasn't burning when we left.
Adam-How's your arm?
Barbara-I don't know. It feels frozen. I'll make some coffee and you get wood for the fire.
Adam-Maybe we should just take things extra slow.
Barbara-Do you remember how we got back up here?
Adam-I'm gonna go back down to the bridge and retrace our steps.
Adam-You saved my...
Barbara-two hours.
Adam-Barbara, you are not gonna believe... what?
Barbara-That's how long you were gone.
Adam-What is going on?
Adam-I have to show you something. Look. [Look around for a few seconds in silence] There's that. and there's that.
Adam-'Handbook for the recently diseased.'
Barbara-Deceased.
Adam-"Deceased "
Barbara-I don't know where it came from. Look at the publisher.
Adam-"Handbook for the Recently Deceased Press."
Barbara-You know what? I don't think we survived the crash.
Barbara-I hate this. Just... can you give me the basics?
Adam-Well, this book isn't arranged that way. What do you wanna know?
Barbara-Well, why did you disappear when you stepped off the porch? Are we halfway to heaven, are we halfway to hell? And how long is this gonna last?
Adam-I don't see anything about heaven or hell. This book reads like stereo instructions. Listen to this: "Geographical and temporal perimeters. Functional perimeters vary from manifestation to manifestation." Oh, this is gonna take some time, honey.
Beetlejuice-Damn sandworms. Thirteen percent, huh? Well, I better find a job. Let's see. Business section. Ooh-la-la. What do we got here? The Maitlands, huh? Cute couple. Look nice and stupid too.
***
Dead Man-Want a cigarette?
Barbara-Uh, no, thank you.
Dead Man-Trying to cut down myself.
Barbara-Adam, is this what happens when you die?
Receptionist-This is what happens when you die. That is what happens when he dies. And that is what happens when they die. It's all very personal. And I'll tell you something. If I knew then what I know now, I wouldn't have had my little accident.
Dead Man-Maitland. Party of two. Take the handbook and go to the sixth door.
Barbara-Oh, we forgot our handbook.
Dead Man-Come on.
Announcer-All new arrivals, report to waiting room number 8. Flight 409 is arriving at gate 3.
Dead Man-How do I look? There are no mirrors on this side.
Adam-Fine. You look fine.
Dead Man-Yeah?
Barbara-Fine.
Dead Woman-Thanks. I've been feeling a little flat.
Announcer-Will the Peterson party report to door number 9? Peterson party, please report to door number 9. All new arrivals, report to waiting room number 8.
Barbara-A hundred and twenty-five years. I can't believe this. I can't believe they didn't tell us. Oh, Adam, what is this?
Janitor-That's the lost souls' room. A room for ghosts that have been exorcised. Poor devils. That's death for the dead. It's all in the handbook. Keep moving.
Adam-Five. This is the sixth door.
Barbara-Boy, oh, boy, this place just gets weirder and weirder.
Adam-Barbara. We're home. Look at this place. Everything's different.
Barbara-All our furniture's gone.
Adam-How long do you suppose we were waiting there?
Juno-Three months. I'd almost given up on you. I was about to leave. I do have other clients.
Barbara-Are you Juno, our caseworker?
Juno-Yes. I evaluate individual cases and determine if help is needed, deserved and available
Adam-Are you available?
Juno-No. What's wrong?
Barbara-We're very unhappy.
Juno-What did you expect? You're dead.
Adam-We want to get rid of the people who moved in here. Barbara and I worked very hard on this house. We probably wouldn't mind sharing the house with people who were...
Juno-More like you used to be.
Barbara-Yes.
Adam-But these people...
Juno-Things seem pretty quiet here. You should thank god you didn't die in Italy. The Deetzes. Okay, have you been studying the manual?
Adam-Well, we tried.
Juno-The intermediate interface chapter on haunting says it all. Get them out yourselves. It's your house. Haunted houses aren't easy to come by.
Barbara-Well, we don't quite get it.
Juno-I heard. Tore your faces right off. It doesn't do any good to pull your heads off in front of people... If they can't see you.
Adam-We should start more simply?
Juno-Start simply. Do what you know. Use your talents. Practice. You should have been studying those lessons since day one. Ooh. I've got to go.
Barbara-What about that guy in the flyer, Betel...?
Juno-Shh! Don't even say his name. You don't want his help.
Barbara-Well...
Adam-We might.
Juno-No, you don't. He does not work well with others.
Adam-What do you mean?
Juno-I didn't want to bring it up. But rather than have you stumble onto it and make another mistake, I'll tell you. He was my assistant. But he was a troublemaker. He went out on his own as a freelance bio-exorcist. Claimed he could get rid of the living. Got into more trouble. In fact, I believe he's been sleazing around your cemetery lately.
The only way he can be brought back... Is by calling his name three times. But I strongly suggest... That you remove the Deetzes yourselves.
Adam-Well, how do we contact you if we need you again?
Barbara-Oh, Adam, that guy's in our cemetery.
Adam-She's right, honey. We just have to keep this simple. We can do this. Come on.
Beetlejuice-Hey, you. Hey, come here. Hungry? Come on. Hey, come here. I got something good for you. Come on. Come on over. We'll have a little bite, you'll have something to nosh. Come here.
***
Lydia-Sick. Sexual perversion. If you guys are gonna do that weird sexual stuff, do it in your own bedroom. [Looks at pictures] No feet. Are you the guys hiding out in the attic?
Adam-We're ghosts.
Barbara-Whoo!
Lydia-What do you look like under there?
Adam-Aren't you scared?
Lydia-I'm not scared of sheets. Are you gross under there? Are you night of the living dead under there? Like all bloody veins and pus?
Adam-Night of the what?
Lydia-Living dead. It's a movie.
Barbara-If I had seen a ghost at your age, I would have been scared out of my wits.
Lydia-You're not gross. Why are you wearing sheets?
Barbara-We're practicing.
Adam-You can see us without the sheets?
Lydia-Of course I can see you.
Adam-Well, how is it that you see us and nobody else can?
Lydia-Well, I read through that ‘Handbook for the Recently Deceased’. It says, "live people ignore the strange and unusual." I myself am strange and unusual.
Barbara-You look like a regular girl to me.
Adam-You read our book?
Lydia-Yeah.
Adam-You could follow it?
Lydia-Yeah. Why were you in Delia's bedroom?
Adam-We were trying to scare your mother.
Lydia-Stepmother. Anyway, you can't scare her. She's sleeping with prince valium tonight.
Lydia-You did this? You carved all these little houses and things?
Adam-Mm-hm.
Lydia-And this used to be your house. Why do you want to scare everybody?
Adam-Well, we wanted to frighten you so you would move out.
Lydia-You don't know the Deetzes very well. My father bought this place. He never walks away from equity. Why don't you leave?
Barbara-We can't. we haven't left the house since the funeral
Lydia-Funeral… god! You guys really are dead. This is amazing.
Charles-Lydia.
Lydia-I better go.
Barbara-Wait. Don't tell your parents that we're up here.
Adam-Unless you think it'll frighten them away. You tell them that we are horrible, desperate, ghoulish creatures who will stop at nothing to get our house back.
Lydia-What if this is a dream? Can you guys do any tricks to prove I'm not dreaming? Well, if you are real ghosts, you guys better get another routine because those sheets... They don't work.`,
    comprehensionQuestions: [
      { position: 1, question: "How much money is Jane's offer for the house today?", answer: "$260,000" },
      { position: 2, question: "Why do Adam and Barbara drive to town?", answer: "Adam needs a new brush for the tung oil and a part for the model" },
      { position: 3, question: "How long was Adam gone when he stepped off the porch?", answer: "Two hours" },
      { position: 4, question: "What does Juno say about the Maitlands' appointment, and why couldn't she wait longer?", answer: "Three months; she was about to leave and she has other clients" },
      { position: 5, question: "How can the guy in the flyer be brought back?", answer: "By calling his name three times" },
      { position: 6, question: "Who should scare the family out of the house?", answer: "Adam and Barbara" },
      { position: 7, question: "According to Lydia, why can she see the ghosts when nobody else can?", answer: "She is strange and unusual" },
      { position: 8, question: "What movie does Lydia mention when she asks if the ghosts are \"gross under there\"?", answer: "Night of the Living Dead" },
      { position: 9, question: "What does Lydia say her stepmother is doing tonight?", answer: "Sleeping with Prince Valium" }
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

// Guard against the 2026-10 Beetlejuice failure: a non-transcript paragraph
// (synopsis, title, URL) leaked into body and the annotator tokenized it,
// offsetting every word position, which silently killed all tap-to-reveal
// tooltips. These checks run BEFORE any DB write.
function validateTranscript(mt: MovieTalk): void {
  const lines = mt.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const first = lines[0] ?? "";
  if (!MOVIE_TALK_SPEAKER_RE.test(first)) {
    throw new Error(
      `${mt.slug}: transcript must START with a Name-Dialogue line ` +
        `(e.g. "Barbara-Ugh, Jane."). First line is: "${first.slice(0, 60)}". ` +
        `A synopsis/title paragraph likely leaked into the body.`
    );
  }

  const nameless = lines.filter(
    (line) => line !== "***" && !MOVIE_TALK_SPEAKER_RE.test(line)
  );
  if (nameless.length > 0) {
    console.warn(
      `${mt.slug}: ${nameless.length} transcript line(s) have no speaker name. ` +
        `They render as plain text and will not get speaker styling. First: ` +
        `"${nameless[0].slice(0, 60)}"`
    );
  }

  const spokenTokens = movieTalkSpokenText(mt.body)
    .split(/\s+/)
    .filter(Boolean).length;
  if (spokenTokens < 10) {
    throw new Error(
      `${mt.slug}: spoken transcript is only ${spokenTokens} tokens. ` +
        `The body looks empty or mis-parsed.`
    );
  }
}

async function seedMovieTalk(
  admin: ReturnType<typeof createAdminClient>,
  mt: MovieTalk,
  force: boolean
) {
  validateTranscript(mt);
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
