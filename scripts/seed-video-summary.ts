// Seed Video Summary Translation lessons (Pre-Intermediate Class 3).
//
//   npx tsx scripts/seed-video-summary.ts                 # seed all lessons
//   npx tsx scripts/seed-video-summary.ts --slug <slug>   # seed one lesson
//   npx tsx scripts/seed-video-summary.ts --slug <slug> --force
//       # required to re-seed a lesson whose paragraphs already have live
//       # teacher translations (re-seeding deletes paragraphs and resets
//       # english_translation to null — would wipe the class record)
//
// To add a lesson: append an entry to LESSONS below with the YouTube URL,
// the English summary (goes into body_text — teacher-only answer key /
// reference panel) and the English-structured Spanish summary (same number
// of paragraphs; students translate it paragraph by paragraph in class).
//
// Video summaries skip the story pipeline entirely: no word annotation,
// no IPA, no Práctica Coral, no comprehension/personal questions.
// Idempotent by slug (upsert). Free.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

type Lesson = {
  slug: string;
  title: string;
  youtubeUrl: string;
  englishSummary: string; // paragraphs separated by blank lines
  spanishSummary: string; // same paragraph count as englishSummary
  level?: string;
  cefr?: string;
  freeWriteMinutes?: number;
};

const LESSONS: Lesson[] = [
  {
    slug: "shaun-sheep-cabbage-football",
    title: "Shaun the Sheep: Cabbage Football",
    youtubeUrl: "https://www.youtube.com/watch?v=WeQw6utcU_g",
    englishSummary: `It was a hot summer day and the sheep were bored. Some were munching on grass, while others were taking a nap. The farmer passed by in his tractor, hauling cabbage. Suddenly, a duck crossed the road in front of him. He was distracted singing and dancing to the radio, and he didn't see the duck till the last minute. When he saw it, he swerved to avoid it. A rock in his way made the trailer jump, throwing a cabbage head into the sheep pen.

Shaun examined the cabbage, not knowing what it was. He shook it. He smelled it. He licked it. It tasted horrible. The pigs thought it looked delicious. He started juggling the ball for fun. His fellow sheep applauded his performance.

Then Shaun involved the others. Soon they got the idea to play a soccer game. They set up a goal, the mama sheep used oven gloves as goalkeeper gloves, and Bitzer blew his whistle to announce the start of the game. He would be the referee. He tossed a coin into the air to decide who would kick first.

The game began and Bitzer gave a yellow card for a foul. The pigs tried to steal the cabbage to eat it, unsuccessfully. One of the sheep kicked the ball through a second-floor window. Another sheep reluctantly entered the house to get the cabbage. Shortly after, Shaun got possession of the ball and dribbled past several defenders. It looked like he was going to score a miraculous goal when the fat sheep tripped him. Bitzer blew the whistle and gave him a red card for the blatant foul. The fat sheep was kicked out of the game. Shaun prepared for the penalty. He rifled a shot to the top left corner. The fans and the team cheered and celebrated.

The ball ended up in the pig pen. They quickly prepared the cabbage to eat. The sheep leapt into action and recovered the ball before they could. The baby sheep kicked the ball very high. A pig jumped towards it. Shaun jumped to get it first. They crashed into each other mid-air and fell to the ground. The cabbage flew into the mouth of a flying duck who thereafter flew away. Without a ball, Bitzer tried to get another one from the farmer. But instead of a cabbage, he got a pumpkin.`,
    // Kyle's edited, English-structured Spanish translation.
    // Note: some sentences are deliberately restructured to mirror English syntax
    // (the "English-structured Spanish" technique from the methodology page).
    spanishSummary: `Era un caluroso día de verano y las ovejas estaban aburridas. Algunas pastaban mientras otras tomaban una siesta. El granjero pasó en su tractor, cargando repollo. De repente, un pato cruzó el camino en frente de él. Estaba distraído cantando y bailando al radio, y no vio el pato hasta el último minuto. Cuando lo vio, dio un volantazo para esquivarlo. Una piedra en su camino hizo que el remolque diera un salto, lanzando una cabeza de repollo en el corral de las ovejas.

Shaun examinó el repollo, sin saber qué era. Lo sacudió. Lo olió. Lo lamió. Sabía horrible. Los cerdos pensaron que pareció delicioso. Él empezó a hacer malabares con la pelota por diversión. Sus compañeras ovejas aplaudieron su desempeño.

Entonces Shaun involucró los demás. Pronto consiguieron la idea jugar un partido de fútbol. Montaron una red, la oveja mamá usó guantes de cocina como guantes de portera, y Bitzer sopló su silbato para anunciar el comienzo del partido. Él sería el árbitro. Lanzó una moneda al aire para decidir quién patearía primero.

Comenzó el partido y Bitzer dio una tarjeta amarilla por una falta. Los cerdos intentaron robar el repollo para comérsela, sin éxito. Una de las ovejas pateó la pelota a través de una ventana del segundo piso. Otra oveja entró de mala gana la casa a conseguir el repollo. Poco después, Shaun consiguió posesión de la pelota y regateó varios defensores. Parecía que iba a marcar un gol milagroso cuando la oveja gorda lo hizo tropezar. Bitzer sopló el silbato y le mostró la tarjeta roja por la falta obvia. La oveja gorda fue expulsada del partido. Shaun se preparó para el penalti. Disparó con fuerza al ángulo superior izquierdo. Los aficionados y el equipo vitorearon y celebraron.

La pelota acabó en el corral de los cerdos. Ellos prepararon rápidamente el repollo para comer. Las ovejas entraron en acción y recuperaron la pelota antes de que pudieran. La oveja bebé pateó la pelota bien alto. Un cerdo saltó hacia ella. Shaun saltó para cogerla primero. Se chocaron en el aire y cayeron al suelo. El repollo voló en la boca de un pato volando quien acto seguido se fue volando. Sin pelota, Bitzer intentó conseguir otra del granjero. Pero en vez de un repollo, consiguió una calabaza.`,
  },
  {
    slug: "mr-bean-late-for-the-dentist",
    title: "Mr. Bean: Late for the Dentist",
    youtubeUrl: "https://www.youtube.com/watch?v=VumrpkL6RS0",
    englishSummary: `It was 8 in the morning and the clock chimed to ring in the hour. Mr Bean’s alarm went off but instead of waking up, he placed it in a cup of water to shut it up. A second elaborate steam alarm then went off. This alarm blew hot water onto Mr Bean’s feet. But instead of waking up, he plugged the nozzle with his big toe.

53 minutes later, he finally woke up. He got out of bed as if sleepwalking. But running into the wall fully woke him up. He calmly and happily made his bed and put on his slippers. He then opened the curtains to let in the sunshine and did some light morning stretching without a care in the world. He turned on his razor and trimmed his beard so that he was cleanshaven. He took out his clothes from the closet, without noticing a note for himself which showed 9 o’clock and the drawing of a mouth. He hung up his soaked alarm clock to dry in the corner. Turning around, he finally took notice of the note on the hanger. At first he couldn’t remember why he had made it. Then it hit him like a ton of bricks. He had a dentist appointment at 9 and it was already 8:55.

He grabbed his clothes, toothbrush and toothpaste and rushed out the door. He threw his things into the car, grabbed a brick and sped off. While driving, he took off his pajamas and began to get dressed. He put on his shirt first. He used the brick to keep the accelerator depressed as he put on his pants. Pulling his pants up, buttoning them up and doing up his belt were especially tricky. He went to the back seat to do it as he used his feet to steer. He managed to steer, turn on his turned light and even honk with his feet. An impressive feat.

After getting his socks on, he returned to the front seat. He entered a traffic circle and went around in circles as he put on his tie and his shoes. He was now fully dressed but there was one more thing he needed to do. He was going to the dentist and hadn’t brushed his teeth yet. Using his teeth, he bit the steering wheel while getting toothpaste on his toothbrush. Then his used his sideview mirror to see what he was doing. After he used his windshield wiper fluid to rinse his mouth. He spit out his toothpaste which landed in the butt crack of a construction worker who thought it was bird poop.

He finally made it. He didn’t want to pay for a parking spot, so he pushed another car out of its spot. The parking meter officer appeared and saw a handkerchief sticking out of Mr Bean’s fly. He quickly pulled it out and zipped up his fly.`,
    spanishSummary: `Eran las ocho de la mañana y el reloj dio las campanadas. El despertador del Sr. Bean sonó, pero en lugar de despertarse, lo metió en un vaso de agua para silenciarlo. Entonces sonó una segunda alarma de vapor, más elaborada, que le roció agua caliente en los pies. Pero en vez de despertarse, tapó la boquilla con el dedo gordo del pie.

53 minutos después, por fin despertó. Se levantó de la cama como si estuviera sonambulando, pero al chocar contra la pared se despertó del todo. Calmamente y alegemente, hizo la cama y se puso las pantuflas. Luego abrió las cortinas para que entrara el sol e hizo algunos estiramientos matutinos sin ninguna preocupación. Encendió la maquinilla de afeitar y se recortó la barba. Sacó la ropa del armario, sin darse cuenta de una nota que indicaba las nueve y el dibujo de una boca. Colgó el despertador empapado en un rincón para que se secara. Al darse la vuelta, se percató de la nota en la percha. Al principio no recordaba por qué lo había hecho. De repente, lo recordó todo. Tenía cita con el dentista a las 9 y ya eran las 8:55.

Agarró su ropa, el cepillo y la pasta de dientes y salió corriendo. Metió sus cosas en el coche, cogió un ladrillo y arrancó a toda velocidad. Mientras conducía, se quitó el pijama y empezó a vestirse. Primero se puso la camisa. Usó el ladrillo para mantener el acelerador pisado mientras se ponía los pantalones. Subirse los pantalones, abotonarlos y abrocharse el cinturón fue especialmente complicado. Fue al asiento trasero para hacerlo mientras manejaba el coche con los pies. Consiguió conducir, encender las luces giratentes e incluso tocar la bocina con los pies. Una hazaña impresionante.

Después de ponerse los calcetines, volvió al asiento delantero. Entró en una rotonda y dio vueltas mientras se ponía la corbata y los zapatos. Ya estaba completamente vestido, pero aún le faltaba una cosa. Iba al dentista y aún no se había cepillado los dientes. Con los dientes, mordió el volante mientras se echaba pasta dental en el cepillo. Luego usó el espejo retrovisor para ver qué hacía. Después, se enjuagó la boca con el líquido limpiaparabrisas. Escupió la pasta dental, que cayó en la colagrieta de un obrero de la construcción que pensaba que era excremento de pájaro.

Finalmente lo logró. No quería pagar por el estacionamiento, así que empujó otro coche fuera de su lugar. El agente de estacionamiento apareció y vio un pañuelo asomando de la bragueta del Sr. Bean. Rápidamente se lo sacó y se subió la cremallera.`,
  },
  {
    slug: "shaun-sheep-babysitting-timmy",
    title: "Shaun the Sheep: Babysitting Timmy",
    youtubeUrl: "https://www.youtube.com/watch?v=_8yI8HwbLrM",
    englishSummary: `It was a Saturday night. The lady sheep were getting themselves dolled up for a night out on the town. One put on lipstick. The other took out her hair rollers to reveal her perfectly done hair. She received cheers from all her girlfriends. Everyone was excited to let loose. A knock was heard at the door. The one who went to open it told everyone to be quiet. Bitzer had arrived to let them know their limo was there.

Before they left, mama sheep left Bitzer in charge of taking care of the little one. She told him to feed him, to bathe him and to put him to bed. She blew a kiss to her angel and Bitzer reassured her that everything would be fine. He spoke too soon. As soon as they left, he had already lost the little one.

He ran inside to find him standing precariously on a night table reaching for a book on the shelf. Bitzer thought the little one wanted him to read him a book. He ignored his request and put him in his high chair to feed him. The little one pouted. He wasn’t interested in food. Bitzer tried to convince him the food was delicious by trying it himself. It wasn’t and the boy continued refusing to eat.

Bitzer came up with another idea. He grabbed a feather and tickled the boy’s feet. This made him open his mouth. When he laughed and Bitzer stuck the spoon in his mouth. However, the feather then landed on the boy’s nose causing him to sneeze. Where did the food go? All over Bitzer’s face.

Bitzer cleaned himself off while preparing the boy’s bath. He found the boy again with his cowboy hat on and his book. Bitzer ignored him and attempted to put him in the bathtub. The boy refused. Bitzer attempted to convince him to get in by dropping his toys into the bath. It worked. Just when Bitzer went to put him in, he was gone again. Where was he?

The boy had grabbed his book again. Bitzer relented and sat down to read the boy his story. But the boy didn’t want him to read the story. He threw Bitzer’s hat onto a conveyer belt and turned it on once Bitzer had gotten on to get it back. He then got on Bitzer’s back and rode him like a horse. After an intense minute of riding, the two flew off. Bitzer was worse for wear and the boy was satisfied.

Fast forward and the mother came home to find her boy watching TV and eating snacks. She was shocked. The boy told his mother to be quiet and pointed to a sleeping Bitzer on his bed.`,
    spanishSummary: `Era sábado por la noche. Las ovejas se estaban arreglando para salir de fiesta. Una se puso pintalabios. La otra se quitó los rulos para lucir su cabello perfectamente peinado. Recibió vítores de todas sus amigas. Todas estaban emocionadas por divertirse. Escucharon un toque en la puerta. Quien fue a abrir les pidió silencio. Bitzer había llegado para avisarles que su limusina estaba allí.

Antes de irse, mamá oveja dejó a Bitzer a cargo del pequeño. Le dijo que le diera de comer, lo bañara y lo acostara. Le sopló un beso a su angelito y Bitzer la tranquilizó diciéndole que todo estaría bien. Habló demasiado pronto. En cuanto se fueron, ya había perdido al pequeño.

Entró corriendo y lo encontró de pie precariamente en una mesita de noche, intentando alcanzar un libro en la estantería. Bitzer pensó que el pequeño quería que le leyera un cuento. Ignoró su petición y lo sentó en su trona para darle de comer. El pequeño hizo pucheros. No estaba interesado en comida. Bitzer intentó convencerlo de que la comida estaba deliciosa probándola él mismo. No lo estaba, y el niño siguió negándose a comer.

A Bitzer se le ocurrió otra idea. Agarró una pluma y le hizo cosquillas en los pies. Esto hizo que el niño abriera la boca. Cuando se rió, Bitzer le metió la cuchara en la boca. Sin embargo, la pluma le dio en la nariz, provocándole un estornudo. ¿Dónde había ido la comida? Por toda la cara de Bitzer.

Bitzer se limpió mientras preparaba el baño del niño. Lo encontró de nuevo con su sombrero de vaquero y su libro. Bitzer lo ignoró e intentó meterlo en la bañera. El niño se negó. Bitzer intentó convencerlo tirando sus juguetes al agua. Funcionó. Justo cuando Bitzer iba a meterlo, había desaparecido otra vez. ¿Dónde estaba?

El niño había vuelto a agarrar su libro. Bitzer cedió y se sentó a leerle su cuento. Pero el niño no quería que le leyera. Lanzó el sombrero de Bitzer a una cinta transportadora y la encendió cuando Bitzer se subió para recuperarlo. Luego se montó sobre Bitzer y lo cabalgó como si fuera un caballo. Tras un intenso minuto de cabalgata, ambos salieron disparados. Bitzer estaba maltrecho y el niño satisfecho.

Tiempo después, la madre llegó a casa y encontró a su hijo viendo la televisión y comiendo bocadillos. Se quedó atónita. El niño le pidió a su madre que se callara y señaló a Bitzer, que dormía en su cama.`,
  },
];

const spanishParagraphs = (text: string) =>
  text.split("\n\n").map((p) => p.trim()).filter(Boolean);

async function seedLesson(admin: ReturnType<typeof createAdminClient>, lesson: Lesson, force: boolean) {
  const englishParagraphs = spanishParagraphs(lesson.englishSummary);
  const spanish = spanishParagraphs(lesson.spanishSummary);

  if (englishParagraphs.length !== spanish.length) {
    throw new Error(
      `${lesson.slug}: paragraph count mismatch (EN ${englishParagraphs.length} vs ES ${spanish.length})`
    );
  }

  // 1. Upsert the Story row
  const { data: story, error: storyError } = await admin
    .from("stories")
    .upsert(
      {
        slug: lesson.slug,
        title: lesson.title,
        kind: "video_summary",
        level: lesson.level ?? "pre-intermediate",
        cefr: lesson.cefr ?? "A2/B1",
        body_text: lesson.englishSummary,
        body_html: lesson.englishSummary,
        word_count: lesson.englishSummary.split(/\s+/).length,
        is_free: false,
        youtube_url: lesson.youtubeUrl,
        spanish_summary: lesson.spanishSummary,
        free_write_minutes: lesson.freeWriteMinutes ?? 5,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .maybeSingle();

  if (storyError || !story) {
    throw new Error(storyError?.message ?? `Failed to upsert story ${lesson.slug}`);
  }

  const storyId = story.id;
  console.log(`Story upserted: ${lesson.slug} (${storyId})`);

  // 2. Guard: refuse to wipe live class translations without --force
  const { data: existing } = await admin
    .from("video_summary_paragraphs")
    .select("english_translation")
    .eq("story_id", storyId);

  const hasTranslations = (existing ?? []).some((p) => p.english_translation !== null);
  if (hasTranslations && !force) {
    throw new Error(
      `${lesson.slug}: paragraphs already contain live teacher translations from a past class. ` +
        `Re-seeding would delete them. Pass --force only if you really want to wipe the class record.`
    );
  }

  // 3. Delete existing paragraphs for this story
  await admin.from("video_summary_paragraphs").delete().eq("story_id", storyId);

  // 4. Insert paragraphs (Spanish text only — english_translation is null,
  //    teacher fills it live during class)
  const paragraphRows = spanish.map((spanishText, position) => ({
    story_id: storyId,
    position,
    spanish_text: spanishText,
    english_translation: null,
    translation_started_at: null,
    translation_completed_at: null,
  }));

  const { error: paraError } = await admin
    .from("video_summary_paragraphs")
    .insert(paragraphRows);

  if (paraError) throw new Error(`Failed to insert paragraphs: ${paraError.message}`);

  console.log(`Inserted ${spanish.length} paragraphs`);

  // 5. Clean up any existing words/comprehension/personal questions
  //    (video summaries don't use the standard annotation pipeline,
  //    but we clean up in case the slug was reused)
  await admin.from("words").delete().eq("story_id", storyId);
  await admin.from("comprehension_questions").delete().eq("story_id", storyId);
  await admin.from("personal_questions").delete().eq("story_id", storyId);

  // 6. Verify
  const { data: verify } = await admin
    .from("video_summary_paragraphs")
    .select("position, spanish_text")
    .eq("story_id", storyId)
    .order("position");

  console.log(`\nVerification — ${verify?.length ?? 0} paragraphs:`);
  verify?.forEach((p) => {
    const preview = p.spanish_text.slice(0, 60) + "...";
    console.log(`  [${p.position}] ${preview}`);
  });

  console.log(`\nEnglish summary word count: ${lesson.englishSummary.split(/\s+/).length}`);
  console.log(`YouTube URL: ${lesson.youtubeUrl}`);
}

async function main() {
  const admin = createAdminClient();

  const slugArgIdx = process.argv.indexOf("--slug");
  const slug = slugArgIdx !== -1 ? process.argv[slugArgIdx + 1] : undefined;
  const force = process.argv.includes("--force");

  const lessons = slug ? LESSONS.filter((l) => l.slug === slug) : LESSONS;
  if (lessons.length === 0) {
    console.error(`No lesson found with slug "${slug}". Available slugs:`);
    LESSONS.forEach((l) => console.error(`  ${l.slug}`));
    process.exit(1);
  }

  for (const lesson of lessons) {
    console.log(`\n========== Seeding: ${lesson.title} ==========`);
    await seedLesson(admin, lesson, force);
  }

  console.log(`\nDone. Seed successful.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
