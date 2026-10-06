export type StoryStepId =
  | "story"
  | "comprehension"
  | "personal"
  | "dictation"
  | "choral"
  | "pronunciation";

export type LessonCopyNote = {
  lead: string;
  body: string;
};

export type StepInstructionsCopy = {
  title: string;
  line: string;
  instructions: string[];
  instructionsLive?: string[];
  lineLive?: string;
  why?: string;
  whyShort?: string;
  whyShortLive?: string;
  note?: LessonCopyNote;
};

export type LessonCopyEntry = Omit<StepInstructionsCopy, "why" | "whyShort"> & {
  why: string;
  whyShort: string;
};

export type VideoSummaryStepId = "video" | "write" | "translate";

export type PresentationCycleStepId =
  | "vocabulario"
  | "preguntas"
  | "video"
  | "respuestas";

export function stepCopyForMode(
  copy: StepInstructionsCopy,
  live: boolean,
): StepInstructionsCopy {
  if (!live) return copy;
  return {
    ...copy,
    instructions:
      copy.instructionsLive && copy.instructionsLive.length > 0
        ? copy.instructionsLive
        : copy.instructions,
    line: copy.lineLive ?? copy.line,
    whyShort: copy.whyShortLive ?? copy.whyShort,
  };
}

export const LESSON_COPY: Record<StoryStepId, LessonCopyEntry> = {
  story: {
    title: "Lee la historia",
    line: "Léela de corrido. Toca las palabras que no entiendas.",
    whyShort:
      "Ningún material tiene la densidad de vocabulario de un texto. Por eso los que leen aprenden más rápido.",
    instructions: [
      "Léela de arriba a abajo sin detenerte. Si la primera lectura se siente difícil, eso es normal. No entres en pánico.",
      "Toca las palabras que no entiendas para ver su traducción y pronunciación.",
      "Cuando termines, vuelve a leer la historia. Esta segunda lectura se siente muy diferente.",
      "En tu tiempo libre, escucha el audio de la historia. Así entrenas tu oído sin esfuerzo.",
    ],
    note: {
      lead: "La regla más importante:",
      body: "no necesitas entender cada palabra de una oración. Si entiendes el *significado* de la oración, estás aprendiendo. Eso es lo que importa.",
    },
    why: "¿No te gusta leer en inglés? Normal. Pero aquí está el dato: ningún material tiene la densidad de vocabulario de un texto. Una película enseña solo con lo que dicen los personajes; un libro lo describe todo con palabras. Por eso los estudiantes que leen aprenden vocabulario mucho más rápido que los que memorizan listas. ¿Y si dudas? Mira a los políglotas: Kato Lomb, Steve Kaufmann, Luca Lampariello, todos aprendieron así. Leer no es tarea. Es el camino más rápido.",
  },
  comprehension: {
    title: "Contesta las preguntas",
    line: "Responde antes de mirar la respuesta.",
    whyShort:
      "Tu cerebro fija lo que aprende leyendo cuando intentas recordarlo. Intentarlo y fallar es el entrenamiento que hace rápido tu memoria.",
    instructions: [
      "Lee la pregunta y escribe tu respuesta *antes* de mirar la respuesta correcta.",
      "No busques la respuesta en el texto con el dedo. Recuérdala. El esfuerzo es el entrenamiento.",
      "Cuando reveles la respuesta, compárala con la tuya con calma. Entender por qué te equivocaste vale más que acertar.",
    ],
    why: "Ver la respuesta primero se siente productivo, pero no lo es. Tu cerebro aprende cuando intenta recordar, no cuando lee. Un estudio de 2006 sobre la práctica de recuperación lo confirmó: los estudiantes que se autoexaminan recuerdan mucho más, días después, que los que solo releen. Intentarlo y fallar es más útil que leerlo y creer que ya lo sabes.",
  },
  personal: {
    title: "Conecta la historia contigo",
    line: "Escribe tus respuestas. Aquí no hay incorrectas.",
    whyShort:
      "Hablar de tu vida te obliga a producir inglés de verdad. Ahí descubres qué te falta decir.",
    instructions: [
      "Aquí no hay respuesta correcta. Las preguntas son sobre tu vida.",
      "Escribe en inglés, aunque te falten palabras. Usa el vocabulario de la historia si puedes.",
      "El Profe Kyle te da retroalimentación enfocada en una o dos cosas para mejorar. No es una calificación.",
    ],
    why: 'Responder preguntas sobre ti mismo te obliga a usar el inglés de verdad: hablar de tu trabajo, tu familia, tu vida. Y ahí aparece algo valioso: notas exactamente qué te falta decir. Ese momento de "¿cómo lo digo?" es donde se aprende. La retroalimentación del Profe te da una o dos prioridades, no una lista infinita de errores.',
  },
  dictation: {
    title: "Entrena tu oído",
    line: "Escucha y escribe lo que oyes.",
    whyShort:
      "Las palabras que crees conocer pueden sonar diferentes cuando se hablan rápido. Este ejercicio te muestra exactamente dónde te falla el oído.",
    instructions: [
      "Escucha la oración y escribe exactamente lo que oyes. Sin ver el texto.",
      "Puedes escucharla las veces que necesites. Va lento a propósito.",
      "Después compara lo que escribiste con la oración real. No es un examen de ortografía: es un diagnóstico de tu oído.",
    ],
    why: "La mayoría de los errores de escucha no son por falta de vocabulario. Son porque las palabras suenan diferente cuando se hablan rápido: se juntan, se comen, cambian. Este ejercicio te muestra exactamente dónde te falla el oído. Los investigadores lo llaman escucha de abajo hacia arriba, y es la base de entender inglés real, no inglés de libro.",
  },
  choral: {
    title: "Repite en voz alta",
    line: "Escucha y repite en voz alta.",
    whyShort:
      "Repetir en voz alta entrena tu boca como el gimnasio: con repeticiones, el sonido sale solo.",
    instructions: [
      "Escucha la oración y repítela en voz alta, imitando el ritmo y la entonación.",
      "Diez repeticiones por ronda, cinco rondas. No pienses en la gramática. Solo escucha y repite.",
      "Si te equivocas, sigue. La boca aprende con repeticiones, no con perfección.",
    ],
    why: "Repetir en voz alta es como ir al gimnasio: tu boca necesita las repeticiones para que el sonido salga solo, sin pensar. Nadie aprendió a tocar guitarra leyendo sobre guitarras. Es incómodo al principio. Es automático a la ronda treinta. Eso es el objetivo.",
  },
  pronunciation: {
    title: "Grábate y escúchate",
    line: "Grábate y compárate con la referencia.",
    whyShort:
      "No puedes corregir un sonido que no puedes escuchar. Grabarte y escucharte es la herramienta más honesta que existe.",
    instructions: [
      "Graba la oración con tu voz y compárala con la referencia.",
      "Escucha tu grabación sin rodeos. Te va a sonar raro. Todos suenan raro la primera vez.",
      "El objetivo no es sonar gringo. Es que la gente te entienda a la primera.",
    ],
    why: "No puedes corregir un sonido que no puedes escuchar. Por eso este ejercicio empieza con tus oídos, no con tu boca. Grabarte y escucharte es la herramienta más honesta que existe: tu oído descubre lo que tu boca hace.",
  },
};

export const DIALOGUE_READ_COPY: LessonCopyEntry = {
  title: "El diálogo",
  line: "Lee tu parte en voz alta con tu grupo. Es lectura fría: nadie la ha preparado, y eso es el punto.",
  whyShort:
    "Ningún material tiene la densidad de vocabulario de un texto, y un diálogo muestra el vocabulario de la conversación real: lo que la gente de verdad dice. Además, leerlo en voz alta ensaya tu boca para la próxima conversación.",
  instructions: [
    "Elige tu personaje con tu grupo. Cada uno lee las líneas de su personaje en voz alta.",
    "Lee de corrido. Si una palabra se te atasca, sigue: las palabras difíciles de hoy son las que repasaremos todos juntos después.",
    "Toca las palabras que no entiendas para ver su traducción y pronunciación.",
    "Cuando terminen de leer, respondan las preguntas juntos.",
  ],
  why: "Ningún material tiene la densidad de vocabulario de un texto: cada oración está construida completamente de palabras, y todo lo que lee alguien que aprende inglés es vocabulario que se queda. Un diálogo tiene una ventaja que un cuento no tiene: es vocabulario de conversación real, lo que la gente de verdad dice, en frases que vas a usar tú también. Y leerlo en voz alta es el ensayo: la boca practica hoy lo que la conversación real pedirá mañana. No es teatro: no hay público ni calificación.",
};

export function readStepCopy(kind: string | null | undefined): LessonCopyEntry {
  return kind === "dialogue" ? DIALOGUE_READ_COPY : LESSON_COPY.story;
}

export const VIDEO_SUMMARY_COPY: Record<
  VideoSummaryStepId,
  StepInstructionsCopy
> = {
  video: {
    title: "El Video",
    line: "Mira el video. Anota solo si quieres.",
    whyShort:
      "Entender la historia es la materia prima de todo lo que sigue. Mira con intención, no por ver.",
    instructions: [
      "Mira el video con atención. Es la base de todo lo que sigue.",
      "Si quieres, anota unas palabras que te ayuden a recordar lo que viste. No es necesario apuntar todo.",
    ],
    why: "Todo lo demás se construye sobre entender la historia. Si miras el video solo por verlo, escribir y traducir después son adivinanzas. Mira con intención: la historia que entiendes es la materia prima de todos los ejercicios que siguen.",
  },
  write: {
    title: "Tu Resumen",
    line: "Escribe tu resumen en inglés hasta que el tiempo termine.",
    whyShort:
      "Escribir te obliga a producir el idioma de verdad. Ahí descubres qué sabes decir y qué te falta.",
    instructions: [
      "Escribe un resumen del video en inglés, con tus propias palabras.",
      "Escribe hasta que el tiempo termine. No tiene que ser perfecto.",
      "El Profe Kyle lee tu resumen para conocer tu inglés, y pensar en el video te deja listo para la traducción.",
    ],
    why: "Escribir en inglés, aunque te falten palabras, te obliga a producir el idioma de verdad. Ahí descubres qué sabes decir y qué te falta. Ese es el mejor calentamiento posible para la traducción, y es exactamente lo que el Profe Kyle necesita ver de tu inglés.",
  },
  translate: {
    title: "Traducción",
    line: "Escribe tu traducción y compárala con la del Profe.",
    lineLive: "Di tu versión en voz alta; el Profe escribe la real.",
    whyShort:
      'El momento de "¿cómo se dice?" es cuando tu mente busca el hueco. Ahí es donde la traducción enseña.',
    instructions: [
      "Escribe tu versión en inglés, oración por oración.",
      "Cuando termines, compárala con la traducción del Profe Kyle.",
    ],
    instructionsLive: [
      "Esta parte es colaborativa. Cuando el Profe Kyle pida una traducción, di tu versión en voz alta; después él escribe la traducción real.",
    ],
    why: 'Al intentar traducir descubres exactamente qué te falta decir. Ese momento de "¿cómo se dice?" es cuando tu mente está buscando el hueco, y lo que veas después cae en un lugar preparado. Nadie aprende frases nuevas sin haber sentido primero que las necesitaba.',
  },
};

export const PRESENTATION_COPY: Record<
  PresentationCycleStepId,
  StepInstructionsCopy
> = {
  vocabulario: {
    title: "Vocabulario",
    line: "Escucha la explicación y pregunta tus dudas.",
    whyShort:
      "Un video lleno de palabras desconocidas es ruido. Conocerlas antes es lo que lo convierte en entrada que tu cerebro sí guarda.",
    instructions: [
      "El Profe Kyle presenta el vocabulario nuevo del video. Escucha las explicaciones.",
      "¿Tienes dudas sobre una palabra? Pregunta ahora. Este es el momento para preguntar.",
    ],
    why: "Ver un video lleno de palabras desconocidas es ruido: entra y no se queda nada. Conocer el vocabulario antes es lo que convierte el video en entrada que tu cerebro sí puede guardar. No es un trámite antes del video. Es lo que hace que el video funcione.",
  },
  preguntas: {
    title: "Preguntas",
    line: "Léelas con calma; las respondemos después del video.",
    whyShort:
      "Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes, estás cazando respuestas, no solo viendo.",
    instructions: [
      "Estas son las preguntas que vas a responder del video.",
      "Léelas con calma, pero no las respondas todavía. Primero toca ver el video.",
    ],
    why: "Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes del video, no estás solo viendo: estás cazando respuestas. Por eso te las damos primero y no después. Escuchar con intención vale mucho más que escuchar y rezar para acordarte.",
  },
  video: {
    title: "Video",
    line: "Mira el video con las preguntas en mente.",
    instructions: [
      "Mira el video y mantén las preguntas en mente.",
      "Si quieres, anota las respuestas para recordarlas. Si tu memoria te alcanza sin notas, también está bien.",
    ],
  },
  respuestas: {
    title: "Respuestas",
    line: "Escribe tu respuesta y compárala.",
    lineLive: "El Profe pregunta; da tu versión en voz alta.",
    whyShort:
      "Producir la respuesta, aunque quede a medias, fija el vocabulario. La correcta es el premio, no el reemplazo.",
    instructions: [
      "Escribe tu respuesta en inglés con tus propias palabras.",
      "Cuando termines, compárala con la respuesta correcta.",
      "Repite esta parte cuando quieras: cada video sirve para practicar a tu ritmo.",
    ],
    instructionsLive: [
      "Esta parte es en vivo: el Profe Kyle pregunta, tú das tu versión en voz alta, y él escribe la respuesta real.",
      "Al final, puedes preguntar cualquier cosa sobre el vocabulario o algo que viste en el video.",
    ],
    why: "Intentar producir la respuesta, aunque quede a medias, enseña más que escuchar la respuesta correcta. El esfuerzo de recordarlo tú es lo que fija el vocabulario en la memoria. La respuesta correcta es el premio final, no el reemplazo del intento.",
  },
};

export const PRESENTATION_CYCLE_STEPS: PresentationCycleStepId[] = [
  "vocabulario",
  "preguntas",
  "video",
  "respuestas",
];

export type MovieTalkCopyId = "warmup" | "synopsis" | "video" | "dialogo";

const MOVIE_TALK_SYNOPSIS_WHY =
  "Saber de qué va la historia libera tu atención para el idioma. No adivinas de qué hablan: escuchas cómo lo dicen.";

const MOVIE_TALK_DIALOGUE_WHY =
  'Aquí escuchaste inglés de verdad, sin ayuda y sin vocabulario preparado. Leer el diálogo te revela lo que en realidad dijeron. Esos momentos de "¡ah, eso era!" son tu cerebro aprendiendo.';

export const CONVERSATION_COPY: StepInstructionsCopy = {
  title: "Conversación",
  line: "Habla en inglés en parejas. Son las mismas preguntas en cada ronda, con una persona nueva.",
  whyShort:
    "Repetir lo mismo con una persona nueva es el método: tu inglés sale más rápido y más seguro en cada ronda. Es la técnica 4/3/2 del lingüista Paul Nation, con evidencia académica detrás.",
  instructions: [
    "Hay seis rondas en parejas. En cada ronda, uno pregunta y el otro responde.",
    "En la primera mitad tu papel es uno; en la mitad del descanso, los roles cambian. Todos preguntan y todos responden.",
    "Las preguntas son las mismas en las seis rondas. Tu pareja cambia cada ronda; tu inglés mejora cada ronda.",
    "El Profe Kyle escucha todas las parejas y deja correcciones en el chat. Léelas: son material para tu siguiente ronda.",
    "Si te falta una palabra, dilo de otra forma. Preguntar cómo se dice también cuenta.",
  ],
  why: "Hablar mejor no viene de hablar de temas nuevos cada vez: viene de repetir. En la técnica 4/3/2, la ronda dos sale mejor que la ronda uno, y la tres mejor que la dos. Aquí nadie repite en seco: cada ronda es con una persona nueva, con las correcciones del Profe en el chat, y el descanso de la mitad para pensar qué mejorar. La confianza no viene de la suerte: viene de la segunda vuelta.",
};

export const MOVIE_TALK_COPY: Record<MovieTalkCopyId, StepInstructionsCopy> = {
  warmup: {
    title: "Warm-up",
    line: "Lee la pregunta y prepárate para comentarla con la clase.",
    instructions: [
      "Lee la pregunta con calma.",
      "Prepárate para comentar tu respuesta con la clase en voz alta.",
    ],
  },
  synopsis: {
    title: "Sinopsis",
    line: "Lee de qué trata el video antes de verlo.",
    whyShort: MOVIE_TALK_SYNOPSIS_WHY,
    why: MOVIE_TALK_SYNOPSIS_WHY,
    instructions: [
      "Lee la sinopsis.",
      "Es un resumen corto de la historia: te dice de qué va, no lo que se dice.",
    ],
  },
  video: {
    title: "Video",
    line: "Mira la escena y busca las respuestas a las preguntas.",
    whyShort:
      "Tu cerebro escucha diferente cuando sabe qué buscar. Con las preguntas antes, estás cazando respuestas, no solo viendo.",
    why: PRESENTATION_COPY.preguntas.why,
    instructions: [
      "Lee las preguntas de la escena con calma, pero no las respondas todavía.",
      "Mira la escena con las preguntas en mente.",
      "Si quieres, anota las respuestas para recordarlas. Si tu memoria te alcanza sin notas, también está bien.",
    ],
  },
  dialogo: {
    title: "Diálogo",
    line: "Lee el diálogo en voz alta con tus compañeros.",
    whyShort: MOVIE_TALK_DIALOGUE_WHY,
    why: MOVIE_TALK_DIALOGUE_WHY,
    instructions: [
      "El Profe Kyle elige a los lectores; leen sus partes en voz alta.",
      "Después de la lectura, repasamos juntos el vocabulario nuevo de la escena.",
      "Toca cualquier palabra que no entiendas para ver su traducción.",
    ],
  },
};

export type WelcomeCopy = {
  title: string;
  body: string;
  bullets: { lead: string; text: string }[];
  closing: string;
  button: string;
};

export const WELCOME_COPY: WelcomeCopy = {
  title: "Bienvenido a tu app de inglés.",
  body: "Esta app acompaña tus clases del Confident Speaker Circle. No es tarea adicional: es el material de tu curso, en tu bolsillo.",
  bullets: [
    {
      lead: "Apoyo para tu estudio.",
      text: "Esta app existe para respaldar lo que hacemos en clase. Si quieres avanzar más rápido, úsala en tu tiempo libre. Si no, la app también te sirve.",
    },
    {
      lead: "Todo se guarda solo.",
      text: "Tus respuestas, tus palabras, tu progreso. Cierras y vuelves cuando quieras.",
    },
    {
      lead: "No hay calificaciones.",
      text: "Aquí se practica. Los errores son información, no castigo.",
    },
    {
      lead: "Toca cualquier palabra.",
      text: "Traducción y pronunciación al instante.",
    },
  ],
  closing: "¿Listo? Tus clases te esperan.",
  button: "Entendido, vamos",
};

export function flattenLessonCopy(
  copy: Record<StoryStepId, LessonCopyEntry> = LESSON_COPY,
): string[] {
  const out: string[] = [];
  for (const entry of Object.values(copy)) {
    out.push(entry.title, entry.line, entry.whyShort, ...entry.instructions);
    if (entry.instructionsLive) out.push(...entry.instructionsLive);
    if (entry.lineLive) out.push(entry.lineLive);
    out.push(entry.why);
    if (entry.note) {
      out.push(entry.note.lead, entry.note.body);
    }
  }
  return out;
}

export function flattenMovieTalkCopy(
  copy: Record<MovieTalkCopyId, StepInstructionsCopy> = MOVIE_TALK_COPY,
): string[] {
  const out: string[] = [];
  for (const entry of Object.values(copy)) {
    out.push(entry.title, entry.line, ...entry.instructions);
    if (entry.whyShort) out.push(entry.whyShort);
    if (entry.why && entry.why !== entry.whyShort) out.push(entry.why);
  }
  return out;
}

export function flattenDialogueReadCopy(
  copy: LessonCopyEntry = DIALOGUE_READ_COPY,
): string[] {
  return [copy.title, copy.line, copy.whyShort, ...copy.instructions, copy.why];
}

export function flattenConversationCopy(
  copy: StepInstructionsCopy = CONVERSATION_COPY,
): string[] {
  const out: string[] = [copy.title, copy.line, ...copy.instructions];
  if (copy.whyShort) out.push(copy.whyShort);
  if (copy.why && copy.why !== copy.whyShort) out.push(copy.why);
  return out;
}

export function flattenWelcomeCopy(copy: WelcomeCopy = WELCOME_COPY): string[] {
  return [
    copy.title,
    copy.body,
    ...copy.bullets.flatMap((bullet) => [bullet.lead, bullet.text]),
    copy.closing,
    copy.button,
  ];
}

export function flattenVideoSummaryCopy(
  copy: Record<VideoSummaryStepId, StepInstructionsCopy> = VIDEO_SUMMARY_COPY,
): string[] {
  const out: string[] = [];
  for (const entry of Object.values(copy)) {
    out.push(entry.title, entry.line, ...entry.instructions);
    if (entry.lineLive) out.push(entry.lineLive);
    if (entry.instructionsLive) out.push(...entry.instructionsLive);
    if (entry.whyShort) out.push(entry.whyShort);
    if (entry.whyShortLive) out.push(entry.whyShortLive);
    if (entry.why) out.push(entry.why);
    if (entry.note) {
      out.push(entry.note.lead, entry.note.body);
    }
  }
  return out;
}

export function flattenPresentationCopy(
  copy: Record<PresentationCycleStepId, StepInstructionsCopy> = PRESENTATION_COPY,
): string[] {
  const out: string[] = [];
  for (const entry of Object.values(copy)) {
    out.push(entry.title, entry.line, ...entry.instructions);
    if (entry.lineLive) out.push(entry.lineLive);
    if (entry.instructionsLive) out.push(...entry.instructionsLive);
    if (entry.whyShort) out.push(entry.whyShort);
    if (entry.whyShortLive) out.push(entry.whyShortLive);
    if (entry.why) out.push(entry.why);
    if (entry.note) {
      out.push(entry.note.lead, entry.note.body);
    }
  }
  return out;
}
