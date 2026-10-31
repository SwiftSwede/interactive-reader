// Evaluación v1 rotation items (Slice 97, Hermes draft). One fresh item per
// structure so retakes never exhaust the pool: drawPlacementPass serves the
// rotation item once the placement item is seen. Same authoring rules as the
// v1 bank: single defensible answer, 3 distractors, no em dashes, American
// English. All items are status: draft until Kyle's copy pass.
import type { SeedItem } from "../src/lib/evaluacion/seed";

const t = (prompt: string, correct: string, wrong: [string, string, string]): SeedItem => ({
  format: "translation", prompt, correct, wrong, source: "hermes_rotation",
});
const f = (prompt: string, correct: string, wrong: [string, string, string]): SeedItem => ({
  format: "fill_blank", prompt, correct, wrong, source: "hermes_rotation",
});
const m = (prompt: string, correct: string, wrong: [string, string, string]): SeedItem => ({
  format: "mc", prompt, correct, wrong, source: "hermes_rotation",
});

export const ROTATION_ITEMS: Record<string, SeedItem> = {
  beg_it_subject: t("Es un perro.", "It's a dog.", ["Is a dog.", "It a dog.", "Is it a dog."]),
  beg_wh_do_questions: t("¿Dónde trabaja tu hermana?", "Where does your sister work?", ["Where does your sister works?", "Where your sister works?", "Where do your sister work?"]),
  beg_prep_place: t("El libro está en la mesa.", "The book is on the table.", ["The book is in the table.", "The book is at the table.", "The book is to the table."]),
  beg_prep_time_at: t("La clase es a las cinco.", "The class is at five.", ["The class is in five.", "The class is on five.", "The class is for five."]),
  beg_past_simple: t("Fui al cine ayer.", "I went to the movies yesterday.", ["I goed to the movies yesterday.", "I go to the movies yesterday.", "I was go to the movies yesterday."]),
  beg_be_plural: t("Nosotros estamos cansados.", "We are tired.", ["We is tired.", "We am tired.", "We be tired."]),
  beg_feel_adjective: t("Me siento feliz.", "I feel happy.", ["I feel happily.", "I feel me happy.", "I feel to be happy."]),
  beg_be_questions: t("¿Estás cansado?", "Are you tired?", ["Do you are tired?", "You are tired?", "Is you tired?"]),
  beg_there_is: t("Hay dos gatos en el patio.", "There are two cats in the yard.", ["There is two cats in the yard.", "It are two cats in the yard.", "There have two cats in the yard."]),
  beg_present_third_person: t("Él bebe café cada mañana.", "He drinks coffee every morning.", ["He drink coffee every morning.", "He drinking coffee every morning.", "He is drink coffee every morning."]),
  beg_possessive_determiners: t("Mi hermana vive en Puebla.", "My sister lives in Puebla.", ["Me sister lives in Puebla.", "Mine sister lives in Puebla.", "I sister lives in Puebla."]),
  beg_prep_time_on: t("Trabajo los domingos.", "I work on Sundays.", ["I work in Sundays.", "I work at Sundays.", "I work by Sundays."]),
  beg_cant: f("I _____ go today.", "can't", ["don't can", "not can", "am not can"]),
  beg_possessive_s: t("La esposa de mi hermano trabaja mucho.", "My brother's wife works a lot.", ["My brothers wife works a lot.", "My brother wife works a lot.", "My brother of wife works a lot."]),
  beg_frequency_adverbs: t("Nunca desayuno en casa.", "I never have breakfast at home.", ["Never I have breakfast at home.", "I have never breakfast at home.", "I never has breakfast at home."]),
  pre_phrasal_put_on: t("Ponte la chamarra.", "Put on your jacket.", ["Put off your jacket.", "Put in your jacket.", "Put up your jacket."]),
  pre_want_to: t("Quiero aprender inglés.", "I want to learn English.", ["I want learn English.", "I wanting to learn English.", "I wants to learn English."]),
  pre_how_long: f("How long have you _____ here?", "lived", ["live", "living", "was lived"]),
  pre_as_as: t("Este libro es tan interesante como esa película.", "This book is as interesting as that movie.", ["This book is so interesting as that movie.", "This book is as interesting than that movie.", "This book is more interesting as that movie."]),
  pre_ppc_since: f("I have been here _____ three o'clock.", "since", ["for", "ago", "from"]),
  pre_used_to: t("Antes vivía en Monterrey.", "I used to live in Monterrey.", ["I use to live in Monterrey.", "I used to living in Monterrey.", "I am used to live in Monterrey."]),
  pre_past_perfect_negative: t("El camión ya se había ido cuando llegué.", "The bus had already left when I arrived.", ["The bus has already left when I arrived.", "The bus was already leave when I arrived.", "The bus have already left when I arrived."]),
  pre_present_continuous_future: t("¿Qué estás haciendo el sábado?", "What are you doing on Saturday?", ["What you doing on Saturday?", "What is you doing on Saturday?", "What are you doing in Saturday?"]),
  pre_zero_conditional: f("If it _____, I don't go out.", "rains", ["rain", "will rain", "rained"]),
  pre_past_continuous: t("Ellos estaban viendo la tele cuando llegué.", "They were watching TV when I arrived.", ["They were watch TV when I arrived.", "They was watching TV when I arrived.", "They are watching TV when I arrived."]),
  pre_have_to: t("Ella tiene que estudiar hoy.", "She has to study today.", ["She have to study today.", "She has study today.", "She must to study today."]),
  pre_ever: f("Have you _____ eaten sushi?", "ever", ["since", "for", "yet"]),
  pre_comparatives: t("La sopa está más caliente que el pan.", "The soup is hotter than the bread.", ["The soup is more hot than the bread.", "The soup is the hotter than the bread.", "The soup is hot than the bread."]),
  pre_phrasal_turn_off: t("Prende la computadora.", "Turn on the computer.", ["Turn off the computer.", "Turn up the computer.", "Turn in the computer."]),
  pre_enjoy_ing: t("Odio levantarme temprano.", "I hate getting up early.", ["I hate get up early.", "I hate to getting up early.", "I hating get up early."]),
  pre_indirect_questions: t("¿Sabes a qué hora abre?", "Do you know what time it opens?", ["Do you know what time opens it?", "Do you know what time does it open?", "You know what time it opens?"]),
  pre_simple_passive: t("Estas casas fueron construidas en los ochenta.", "These houses were built in the eighties.", ["These houses was built in the eighties.", "These houses were build in the eighties.", "These houses were building in the eighties."]),
  int_negative_any: f("I don't have _____ cash.", "any", ["no", "none", "nothing"]),
  int_ago: f("I started two months _____.", "ago", ["before", "since", "last"]),
  int_whose: t("¿De quién es este suéter?", "Whose sweater is this?", ["Who's sweater is this?", "Who sweater is this?", "Whose sweater this is?"]),
  int_want_object_to: t("Quiero que ella me llame.", "I want her to call me.", ["I want that she calls me.", "I want she to call me.", "I want her calling me."]),
  int_participle_adjective: t("Encontré la ventana rota.", "I found the broken window.", ["I found the break window.", "I found the broke window.", "I found the breaking window."]),
  int_gerund_not_allowed: t("No se permite fumar en el avión.", "Smoking is not allowed on the plane.", ["Smoke is not allowed on the plane.", "To smoke is not allowed on the plane.", "Smoking is no allowed on the plane."]),
  int_do_make: t("Tengo que hacer la tarea.", "I have to do my homework.", ["I have to make my homework.", "I have to make doing my homework.", "I have to doing my homework."]),
  int_should_have: t("Debiste llamarme.", "You should have called me.", ["You should called me.", "You should have call me.", "You should has called me."]),
  int_second_conditional: f("If I _____ you, I would accept.", "were", ["am", "would be", "have been"]),
  int_past_perfect: t("Cuando llegué, la película ya había empezado.", "When I arrived, the movie had already started.", ["When I arrived, the movie has already started.", "When I arrived, the movie was already start.", "When I arrived, the movie have already started."]),
  int_present_perfect_continuous: t("Llevamos dos horas esperando.", "We have been waiting for two hours.", ["We are waiting for two hours ago.", "We have waiting for two hours.", "We has been waiting for two hours."]),
  int_question_tags: t("No te gusta el café, ¿verdad?", "You don't like coffee, do you?", ["You don't like coffee, don't you?", "You don't like coffee, isn't it?", "You don't like coffee, does you?"]),
  int_reported_speech: t("Dijo que vendría el lunes.", "He said that he would come on Monday.", ["He said that he will come on Monday.", "He said that he comes on Monday.", "He said that he come on Monday."]),
  int_must_deduction: t("Debe estar enfermo, no contesta.", "He must be sick; he isn't answering.", ["He must to be sick; he isn't answering.", "He must being sick; he isn't answering.", "He can to be sick; he isn't answering."]),
  upp_would_conditional: f("If I had more money, I _____ travel more often.", "would", ["will", "had", "am"]),
  upp_passive_past: t("Nos obligaron a comprar el paquete completo.", "We were forced to buy the full package.", ["We was forced to buy the full package.", "We were force to buy the full package.", "We are forced to buy the full package."]),
  upp_gerund_subject: f("_____ a language takes time.", "Learning", ["To learning", "Learn", "Learned"]),
  upp_hardly_ever: f("I hardly _____ watch TV.", "ever", ["never", "always", "usually"]),
  upp_idiom_set_sights: m('To "give someone the cold shoulder" means _____.', "to ignore someone", ["to greet them warmly", "to lend them money", "to walk beside them"]),
  upp_phrasal_give_away: t("Regaló todos sus muebles viejos.", "He gave away all his old furniture.", ["He gave up all his old furniture.", "He gave in all his old furniture.", "He gave off all his old furniture."]),
  upp_the_more: t("Cuanto más practicas, mejor hablas.", "The more you practice, the better you speak.", ["More you practice, more you speak.", "The more you practice, the more better you speak.", "If you practice more, the better you speak."]),
  upp_by_chance: t("Lo encontré por casualidad en el mercado.", "I found it by chance at the market.", ["I found it in chance at the market.", "I found it on chance at the market.", "I found it with chance at the market."]),
  upp_as_soon_as: t("Llámame en cuanto llegues.", "Call me as soon as you arrive.", ["Call me as soon you arrive.", "Call me so soon as you arrive.", "Call me as soon as you will arrive."]),
  upp_idiom_jump_at: m('If you "turn down" an offer, you _____.', "refuse it", ["accept it quickly", "raise the price", "repeat it out loud"]),
  upp_havent_in_ages: t("Hace meses que no la veo.", "I haven't seen her in months.", ["I don't see her since months.", "I haven't see her in months.", "I haven't seen her since months."]),
  upp_despite: t("Aunque estaba cansado, terminó el proyecto.", "Despite being tired, he finished the project.", ["Despite he was tired, he finished the project.", "Despite of being tired, he finished the project.", "Despite of he was tired, he finished the project."]),
  upp_phrasal_head_out: f("We _____ early to avoid traffic.", "set off", ["set down", "set up", "set in"]),
  upp_should_have_ing: t("Deberías haber revisado el contrato antes de firmarlo.", "You should have reviewed the contract before signing it.", ["You should have review the contract before signing it.", "You should have reviewed the contract before sign it.", "You should has reviewed the contract before signing it."]),
};
