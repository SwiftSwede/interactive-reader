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

export type LessonCopyEntry = {
  title: string;
  instructions: string[];
  why: string;
  note?: LessonCopyNote;
};

export const LESSON_COPY: Record<StoryStepId, LessonCopyEntry> = {
  story: {
    title: "Lee la historia",
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
    instructions: [
      "Lee la pregunta y escribe tu respuesta *antes* de mirar la respuesta correcta.",
      "No busques la respuesta en el texto con el dedo. Recuérdala. El esfuerzo es el entrenamiento.",
      "Cuando reveles la respuesta, compárala con la tuya con calma. Entender por qué te equivocaste vale más que acertar.",
    ],
    why: "Ver la respuesta primero se siente productivo, pero no lo es. Tu cerebro aprende cuando intenta recordar, no cuando lee. Un estudio de 2006 sobre la práctica de recuperación lo confirmó: los estudiantes que se autoexaminan recuerdan mucho más, días después, que los que solo releen. Intentarlo y fallar es más útil que leerlo y creer que ya lo sabes.",
  },
  personal: {
    title: "Conecta la historia contigo",
    instructions: [
      "Aquí no hay respuesta correcta. Las preguntas son sobre tu vida.",
      "Escribe en inglés, aunque te falten palabras. Usa el vocabulario de la historia si puedes.",
      "El Profe Kyle te da retroalimentación enfocada en una o dos cosas para mejorar. No es una calificación.",
    ],
    why: 'Responder preguntas sobre ti mismo te obliga a usar el inglés de verdad: hablar de tu trabajo, tu familia, tu vida. Y ahí aparece algo valioso: notas exactamente qué te falta decir. Ese momento de "¿cómo lo digo?" es donde se aprende. La retroalimentación del Profe te da una o dos prioridades, no una lista infinita de errores.',
  },
  dictation: {
    title: "Entrena tu oído",
    instructions: [
      "Escucha la oración y escribe exactamente lo que oyes. Sin ver el texto.",
      "Puedes escucharla las veces que necesites. Va lento a propósito.",
      "Después compara lo que escribiste con la oración real. No es un examen de ortografía: es un diagnóstico de tu oído.",
    ],
    why: "La mayoría de los errores de escucha no son por falta de vocabulario. Son porque las palabras suenan diferente cuando se hablan rápido: se juntan, se comen, cambian. Este ejercicio te muestra exactamente dónde te falla el oído. Los investigadores lo llaman escucha de abajo hacia arriba, y es la base de entender inglés real, no inglés de libro.",
  },
  choral: {
    title: "Repite en voz alta",
    instructions: [
      "Escucha la oración y repítela en voz alta, imitando el ritmo y la entonación.",
      "Diez repeticiones por ronda, cinco rondas. No pienses en la gramática. Solo escucha y repite.",
      "Si te equivocas, sigue. La boca aprende con repeticiones, no con perfección.",
    ],
    why: "Repetir en voz alta es como ir al gimnasio: tu boca necesita las repeticiones para que el sonido salga solo, sin pensar. Nadie aprendió a tocar guitarra leyendo sobre guitarras. Es incómodo al principio. Es automático a la ronda treinta. Eso es el objetivo.",
  },
  pronunciation: {
    title: "Grábate y escúchate",
    instructions: [
      "Graba la oración con tu voz y compárala con la referencia.",
      "Escucha tu grabación sin rodeos. Te va a sonar raro. Todos suenan raro la primera vez.",
      "El objetivo no es sonar gringo. Es que la gente te entienda a la primera.",
    ],
    why: "No puedes corregir un sonido que no puedes escuchar. Por eso este ejercicio empieza con tus oídos, no con tu boca. Grabarte y escucharte es la herramienta más honesta que existe: tu oído descubre lo que tu boca hace.",
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
    out.push(entry.title, ...entry.instructions, entry.why);
    if (entry.note) {
      out.push(entry.note.lead, entry.note.body);
    }
  }
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
