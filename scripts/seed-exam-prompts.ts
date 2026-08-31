// Seed real exam prompts into the database.
//
//   npx tsx scripts/seed-exam-prompts.ts
//
// Inserts one pre-intermediate and one intermediate exam prompt.
// Idempotent: updates the row if a prompt with the same title+level already exists.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";
import { parseExamForm } from "../src/lib/exam";

type ExamSeed = {
  title: string;
  theme: string;
  level: "pre-intermediate" | "intermediate";
  vocabRaw: string;
  task1Raw: string;
  task2Raw: string;
  task3Raw: string;
  timeLimitMinutes: number;
};

const EXAMS: ExamSeed[] = [
  {
    title: "Agosto — Niñera",
    theme: "Babysitting",
    level: "pre-intermediate",
    timeLimitMinutes: 35,
    vocabRaw: `Ashamed | avergonzado
Beat up | dar una paliza
Brat | mocoso
Come up with | idear
Disturb | molestar
Drawer | cajón
Get carried away | dejarse llevar
Glance | mirada
Look after | cuidar de
Ought to | debería
Pout | hacer pucheros
Quiet | tranquilo
Reassure | tranquilizar
Request (noun) | solicitud
Sneeze | estornudar
Snitch / rat out (verb) | acusar
Starve | morirse de hambre
Stubborn | terco
Swear / cuss | decir una mala palabra
Take the fall | echarse la culpa
Tickle | cosquilla
Update | actualización`,
    task1Raw: `On Friday night, Mrs. Rivera asked me to {cuidar de|look after} her two children, Leo and Sofia.
Before she left, she made one important {solicitud|request}: "Please keep the house {tranquilo|quiet} after eight o'clock."
I promised to send her an {actualización|update} later that evening, so she would not worry.
At first, I sat on the sofa and took a quick {mirada|glance} at my phone while the children played.
Then Leo, a spoiled little {mocoso|brat}, opened a kitchen {cajón|drawer} and found a bag of candy.
He wanted to eat all of it, but I told him he {debería|ought to} save some for his sister.
Leo became very {terco|stubborn}, crossed his arms, and started to {hacer pucheros|pout}.
Sofia saw the candy and said, "If you don't share, I'll {acusarte|snitch|rat you out} to Mom!"
Leo got angry and said he would {dar una paliza|beat up} her stuffed bear, but I told him that threatening people or their things was not acceptable.
He looked {avergonzado|ashamed} when he realized I had heard him.
Just then, Sofia began to {estornudar|sneeze}, and Leo said the noise would {molestar|disturb} the neighbors.
I {tranquilicé|reassured} her he was exaggerating and gave her a tissue and a glass of water.
Soon, both children said they were going to {morirse de hambre|starve}, even though they had eaten dinner only an hour earlier.
I had to {idear|come up with} a simple solution, so we made fruit sandwiches together.
The children became excited and started to {dejarse llevar|get carried away} by the activity, putting far too much peanut butter on the bread.
When Leo accidentally knocked over a cup and {dijo una mala palabra|swore|cussed}, Sofia offered to {echarse la culpa|take the fall} because she thought he would get in trouble.
To change the mood, I gave Leo a gentle {cosquilla|tickle} to show that nobody was in trouble.`,
    task2Raw: `fix | The dog has to looking after the baby. | The dog has to look after the baby.
ok | I think a child can take care of themselves when they're 13.
fix | He just wanted the dog read him a story. | He just wanted the dog to read him a story.
fix | They was picked up by a limousine. | They were picked up by a limousine.
fix | They find the baby sheep seeing TV. | They find the baby sheep watching TV.
fix | The dog asleep. | The dog fell asleep.
ok | I'm pretty sure my family would never trust an American babysitter.
fix | We can see how complicated is to be a babysitter. | We can see how complicated it is to be a babysitter.
ok | In the end, Bitzer was a very tired dog.
fix | I take him a lot of photos. | I take a lot of photos of him.`,
    task3Raw: `Tití me ama mucho. | Auntie loves me a lot.
Tití me preguntó si tengo muchas novias. | Auntie asked me if I have a lot of girlfriends.
Soy la niñera cuando mi hermana y cuñado salen. | I'm the babysitter when my sister and my brother-in-law go out.
Cuidar a mi hijo sola no es fácil. | Taking care of my son by myself isn't easy.
¿Las estaciones del año se escriben con mayúscula en inglés? | Are the seasons written with a capital letter in English? | Are the seasons spelled with a capital letter in English?
Hay demasiada violencia en mi país. | There is too much violence in my country.
Siempre me ayudaron con mis tareas colegiales. | They always helped me with my homework.
Mis amigos actuales no tienen hijos tampoco. | My current friends don't have children either.
Ella contrataría a la niñera mexicana si entendiera lo que decía. | She would hire the Mexican babysitter if she understood what she said.
Yo habría sido un mejor adolescente si mi madre me hubiera abrazado más. | I would have been a better teenager if my mom had hugged me more.`,
  },
  {
    title: "Agosto — Jefes",
    theme: "Bosses",
    level: "intermediate",
    timeLimitMinutes: 35,
    vocabRaw: `Approach | enfoque
Barred | prohibidas
Bond | vínculo
Brainy | inteligente
Catch on | darse cuenta
Cherished | apreciado
Embezzle | malversar
Fallout | consecuencias
Harsh | severa
Instill | inculcar
Live up to | estar a la altura de
Outcome | resultado
Outstanding | sobresaliente
Pull for | apoyar
Rant | perorata
Reprimand | reprenda
Sacked | despedido
Shortcoming | defecto
Slacker | flojo
Stickler | persona estricta
Sweep under the rug | ocultar
Under the radar | desapercibido
Whistleblower | denunciante
Witness | presenciar`,
    task1Raw: `When I started at Northgate Media, I loved Daniel's relaxed {enfoque|approach} to managing people.
He trusted us to do our jobs, and he was deeply {apreciado|cherished} by the whole team.
The strong {vínculo|bond} between Daniel and his employees made the office feel more like a community than a workplace.
He would always {apoyar|pull for} new employees when they attempted to do something difficult.
However, Daniel's biggest {defecto|shortcoming} was that he gave too many chances to Mark, the office {flojo|slacker}.
Mark regularly arrived late, missed deadlines, and assumed that nobody would notice and since Daniel rarely checked the expense reports, Mark tried to {malversar|embezzle} company money by submitting fake travel receipts.
He hoped the missing money would go {desapercibido|under the radar}, but I {presencié|witnessed} him putting suspicious invoices into his desk drawer one evening.
Ana, our {inteligente|brainy} finance analyst, soon began to {darse cuenta|catch on} that the numbers did not add up.
She became a {denunciante|whistleblower} and reported what she had found to the directors.
Her decision caused serious {consecuencias|fallout}: Mark was fired immediately, and Daniel was also {despedido|sacked} because he had tried to {ocultar|sweep under the rug} Mark's behavior instead of reporting it.
Our new boss, Ms. Chase, was completely different.
She was a {persona estricta|stickler} about every policy, and casual conversations during work hours were {prohibidas|barred}.
On my first week under her, she gave me a {reprenda|reprimand} for arriving three minutes late; it felt unnecessarily {severa|harsh}.
At a team meeting, she went on a long {perorata|rant} about responsibility and professionalism.
At first, we hated her rules, but she was trying to {inculcar|instill} better habits in the team.
She said everyone had to {estar a la altura de|live up to} the company's ethical standards, not just meet their deadlines.
Three months later, the {resultado|outcome} of her changes was {sobresaliente|outstanding}: our reports were more accurate, and nobody was afraid to report a problem.`,
    task2Raw: `C | Firstly, I'm incredibly lazy.
F | One time I gave an annoying customer the middle finger because I knew my boss wouldn't do anything about it.
A | If you've be fully employed for a meaningful length of time, you've probably had your share of both strict and laid-back bosses.
E | Secondly, I cause trouble if there is no authority figure.
D | If someone isn't breathing down my neck from the moment I walk in the door, I just stare at the ceiling.
G | It's because of my unique personality that I can only be a functional coworker and employee with a draconian boss.
B | Personally, I react best to a strict boss.`,
    task3Raw: `Me enorgullezco de mi trabajo. | I am proud of my work. | I take pride in my work.
Es posible que nos demande. | It's likely they'll sue us.
Les recuerdo que les he hecho favores en el pasado cuando les pido que trabajen horas extras. | I remind them that I've done favors for them in the past when I ask them to work overtime.
Estaba adolorida durante tres días después de mi entrenamiento. | I was sore for 3 days after my workout.
Mi jefe hace cumplir un estricto código de vestimenta. | My boss enforces a strict dress code.
No me regañes por algo tan insignificante. | Don't reprimand me for something so insignificant. | Don't give me shit for something so insignificant. | Don't dress me down for something so insignificant. | Don't scold me for something so insignificant.
¿Al menos te dieron una buena liquidación? | Did they give you a good severance package at least? | Were you given a good severance package at least?
Acordamos una fecha para la reunión. | We agreed on a date for the meeting. | We agreed upon a date for the meeting.
Si mi jefe fuera menos mandón, no estaría tan estresado. | If my boss were less bossy, I wouldn't be so stressed out.
Si hubiera escuchado a su madre, no se habría desviado del buen camino. | If he had listened to his mother, he wouldn't have gone down the wrong path.`,
  },
];

async function main() {
  const admin = createAdminClient();

  // Get the teacher profile
  const { data: teacher, error: teacherError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle();

  if (teacherError || !teacher) {
    console.error("No teacher profile found:", teacherError?.message);
    process.exit(1);
  }

  for (const seed of EXAMS) {
    const task2Type =
      seed.level === "intermediate"
        ? "paragraph_restructuring"
        : "sentence_correction";

    const parsed = parseExamForm({
      title: seed.title,
      theme: seed.theme,
      vocabRaw: seed.vocabRaw,
      task1Raw: seed.task1Raw,
      task2Type,
      task2Raw: seed.task2Raw,
      task3Raw: seed.task3Raw,
      timeLimitMinutes: seed.timeLimitMinutes,
    });

    if (parsed.error) {
      console.error(`✗ ${seed.title}: ${parsed.error}`);
      continue;
    }

    // Check if a prompt with this title+level already exists
    const { data: existing } = await admin
      .from("exam_prompts")
      .select("id")
      .eq("title", seed.title)
      .eq("level", seed.level)
      .maybeSingle();

    const payload = {
      title: parsed.title,
      level: seed.level,
      theme: parsed.theme,
      vocabulary_list: parsed.vocabularyList,
      fill_in_translation: parsed.fillInTranslation,
      task2_type: parsed.task2Type,
      paragraph_restructuring: parsed.paragraphRestructuring,
      sentence_correction: parsed.sentenceCorrection,
      translation_sentences: parsed.translationSentences,
      time_limit_minutes: parsed.timeLimitMinutes,
      created_by: teacher.id,
    };

    if (existing) {
      const { error } = await admin
        .from("exam_prompts")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        console.error(`✗ ${seed.title}: update failed — ${error.message}`);
        continue;
      }
      console.log(
        `✓ Updated "${seed.title}" (${seed.level}) — id: ${existing.id}`
      );
    } else {
      const { data, error } = await admin
        .from("exam_prompts")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error(
          `✗ ${seed.title}: insert failed — ${error?.message ?? "no data"}`
        );
        continue;
      }
      console.log(
        `✓ Inserted "${seed.title}" (${seed.level}) — id: ${data.id}`
      );
    }

    // Summary
    console.log(
      `  vocab: ${parsed.vocabularyList.length} | ` +
        `task1: ${parsed.fillInTranslation.length} sentences, ` +
        `${parsed.fillInTranslation.reduce(
          (n, s) => n + s.slots.length,
          0
        )} slots | ` +
        `task2: ${
          parsed.sentenceCorrection?.length ??
          parsed.paragraphRestructuring?.length ??
          0
        } | ` +
        `task3: ${parsed.translationSentences.length}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
