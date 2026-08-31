// Seed the Shaun the Sheep video summary translation lesson.
//
//   npx tsx scripts/seed-video-summary.ts
//
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const SLUG = "shaun-sheep-cabbage-football";
const TITLE = "Shaun the Sheep: Cabbage Football";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=WeQw6utcU_g";

const ENGLISH_SUMMARY = `It was a hot summer day and the sheep were bored. Some were munching on grass, while others were taking a nap. The farmer passed by in his tractor, hauling cabbage. Suddenly, a duck crossed the road in front of him. He was distracted singing and dancing to the radio, and he didn't see the duck till the last minute. When he saw it, he swerved to avoid it. A rock in his way made the trailer jump, throwing a cabbage head into the sheep pen.

Shaun examined the cabbage, not knowing what it was. He shook it. He smelled it. He licked it. It tasted horrible. The pigs thought it looked delicious. He started juggling the ball for fun. His fellow sheep applauded his performance.

Then Shaun involved the others. Soon they got the idea to play a soccer game. They set up a goal, the mama sheep used oven gloves as goalkeeper gloves, and Bitzer blew his whistle to announce the start of the game. He would be the referee. He tossed a coin into the air to decide who would kick first.

The game began and Bitzer gave a yellow card for a foul. The pigs tried to steal the cabbage to eat it, unsuccessfully. One of the sheep kicked the ball through a second-floor window. Another sheep reluctantly entered the house to get the cabbage. Shortly after, Shaun got possession of the ball and dribbled past several defenders. It looked like he was going to score a miraculous goal when the fat sheep tripped him. Bitzer blew the whistle and gave him a red card for the blatant foul. The fat sheep was kicked out of the game. Shaun prepared for the penalty. He rifled a shot to the top left corner. The fans and the team cheered and celebrated.

The ball ended up in the pig pen. They quickly prepared the cabbage to eat. The sheep leapt into action and recovered the ball before they could. The baby sheep kicked the ball very high. A pig jumped towards it. Shaun jumped to get it first. They crashed into each other mid-air and fell to the ground. The cabbage flew into the mouth of a flying duck who thereafter flew away. Without a ball, Bitzer tried to get another one from the farmer. But instead of a cabbage, he got a pumpkin.`;

// Kyle's edited, English-structured Spanish translation.
// Note: some sentences are deliberately restructured to mirror English syntax
// (the "English-structured Spanish" technique from the methodology page).
const SPANISH_SUMMARY = `Era un caluroso día de verano y las ovejas estaban aburridas. Algunas pastaban mientras otras tomaban una siesta. El granjero pasó en su tractor, cargando repollo. De repente, un pato cruzó el camino en frente de él. Estaba distraído cantando y bailando al radio, y no vio el pato hasta el último minuto. Cuando lo vio, dio un volantazo para esquivarlo. Una piedra en su camino hizo que el remolque diera un salto, lanzando una cabeza de repollo en el corral de las ovejas.

Shaun examinó el repollo, sin saber qué era. Lo sacudió. Lo olió. Lo lamió. Sabía horrible. Los cerdos pensaron que pareció delicioso. Él empezó a hacer malabares con la pelota por diversión. Sus compañeras ovejas aplaudieron su desempeño.

Entonces Shaun involucró los demás. Pronto consiguieron la idea jugar un partido de fútbol. Montaron una red, la oveja mamá usó guantes de cocina como guantes de portera, y Bitzer sopló su silbato para anunciar el comienzo del partido. Él sería el árbitro. Lanzó una moneda al aire para decidir quién patearía primero.

Comenzó el partido y Bitzer dio una tarjeta amarilla por una falta. Los cerdos intentaron robar el repollo para comérsela, sin éxito. Una de las ovejas pateó la pelota a través de una ventana del segundo piso. Otra oveja entró de mala gana la casa a conseguir el repollo. Poco después, Shaun consiguió posesión de la pelota y regateó varios defensores. Parecía que iba a marcar un gol milagroso cuando la oveja gorda lo hizo tropezar. Bitzer sopló el silbato y le mostró la tarjeta roja por la falta obvia. La oveja gorda fue expulsada del partido. Shaun se preparó para el penalti. Disparó con fuerza al ángulo superior izquierdo. Los aficionados y el equipo vitorearon y celebraron.

La pelota acabó en el corral de los cerdos. Ellos prepararon rápidamente el repollo para comer. Las ovejas entraron en acción y recuperaron la pelota antes de que pudieran. La oveja bebé pateó la pelota bien alto. Un cerdo saltó hacia ella. Shaun saltó para cogerla primero. Se chocaron en el aire y cayeron al suelo. El repollo voló en la boca de un pato volando quien acto seguido se fue volando. Sin pelota, Bitzer intentó conseguir otra del granjero. Pero en vez de un repollo, consiguió una calabaza.`;

// Split into paragraphs (double newline separator)
const spanishParagraphs = SPANISH_SUMMARY.split("\n\n").map((p) => p.trim()).filter(Boolean);
const englishParagraphs = ENGLISH_SUMMARY.split("\n\n").map((p) => p.trim()).filter(Boolean);

async function main() {
  const admin = createAdminClient();

  // 1. Upsert the Story row
  const { data: story, error: storyError } = await admin
    .from("stories")
    .upsert(
      {
        slug: SLUG,
        title: TITLE,
        kind: "video_summary",
        level: "pre-intermediate",
        cefr: "A2/B1",
        body_text: ENGLISH_SUMMARY,
        body_html: ENGLISH_SUMMARY,
        word_count: ENGLISH_SUMMARY.split(/\s+/).length,
        is_free: false,
        youtube_url: YOUTUBE_URL,
        spanish_summary: SPANISH_SUMMARY,
        free_write_minutes: 5,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .maybeSingle();

  if (storyError || !story) {
    throw new Error(storyError?.message ?? `Failed to upsert story ${SLUG}`);
  }

  const storyId = story.id;
  console.log(`Story upserted: ${SLUG} (${storyId})`);

  // 2. Delete existing paragraphs for this story
  await admin.from("video_summary_paragraphs").delete().eq("story_id", storyId);

  // 3. Insert paragraphs (Spanish text only — english_translation is null,
  //    teacher fills it live during class)
  const paragraphRows = spanishParagraphs.map((spanishText, position) => ({
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

  console.log(`Inserted ${spanishParagraphs.length} paragraphs`);

  // 4. Clean up any existing words/comprehension/personal questions
  //    (video summaries don't use the standard annotation pipeline,
  //    but we clean up in case the slug was reused)
  await admin.from("words").delete().eq("story_id", storyId);
  await admin.from("comprehension_questions").delete().eq("story_id", storyId);
  await admin.from("personal_questions").delete().eq("story_id", storyId);

  // 5. Verify
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

  console.log(`\nEnglish summary word count: ${ENGLISH_SUMMARY.split(/\s+/).length}`);
  console.log(`YouTube URL: ${YOUTUBE_URL}`);
  console.log(`\nDone. Seed successful.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
