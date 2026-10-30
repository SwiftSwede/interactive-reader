import type { Opener, Track } from "./types";

/**
 * [copy] Every string here is a Cursor draft until Kyle's copy pass.
 * Opener labels are Kyle's verbatim (workshop level field + "No sé nada").
 */
export const evalUiCopy = {
  splashTitle: "¿Puedes ganarme?",
  splashLead:
    "Una evaluación rápida de inglés. Sin registro. Al final te digo en qué nivel estás y qué te falta.",
  splashNote: "Unos 10 minutos. Si no sabes una, toca No sé. Eso también me dice algo.",
  splashStart: "Empezar",
  splashResume: "Seguir donde iba",
  splashRestart: "Empezar de nuevo",
  openerTitle: "¿Cómo va tu inglés hoy?",
  openerNote: "Elige la que más se parece a ti. Igual la prueba se ajusta sola.",
  questionTranslation: "Elige la mejor traducción.",
  questionFill: "Completa la oración.",
  questionMc: "Elige la respuesta correcta.",
  next: "Siguiente",
  quit: "Salir de la evaluación",
  quitConfirm: "¿Salir? Tus respuestas quedan guardadas en este dispositivo.",
  draftBadge: "borrador",
  transition: {
    promote: {
      title: "Vas muy bien.",
      body: "Subimos un nivel. Las siguientes son más difíciles, así que no te asustes si te cuesta.",
    },
    demote: {
      title: "Vamos a bajar un poco.",
      body: "Quiero encontrar tu punto exacto. Las siguientes son más sencillas.",
    },
    confirmation: {
      title: "Unas pocas más.",
      body: "Quiero confirmar un par de cosas que vi. Son solo unas preguntas.",
    },
    pairs: {
      title: "Ahora, a escuchar.",
      body: "Vas a oír una palabra. Elige la que escuchaste. Puedes repetirla las veces que quieras.",
    },
  },
  questionPairs: "¿Qué palabra escuchas?",
  listen: "Escuchar",
  audioPending: "Audio pendiente. Elige la que te parezca.",
  listeningTitle: "Tu oído",
  listeningNote: "Estos sonidos no existen igual en español. Por eso se confunden.",
  listeningClean: "Bien",
  listeningMisses: (wrong: number, total: number) => `Te confundiste en ${wrong} de ${total}.`,
  listeningAllClean: "Distingues bien estos sonidos. Tu oído va por buen camino.",
  continueCta: "Seguir",
  resultEyebrow: "Tu resultado",
  challengeWon: "¿Puedes ganarme? Parece que sí.",
  challengeNotYet: "¿Puedes ganarme? Todavía no, pero ya sé por qué.",
  resultGentleTitle: "Empecemos por la base.",
  resultGentleBody:
    "Hoy te costó bastante, y está bien. Eso me dice exactamente por dónde empezar contigo.",
  confirmedTitle: "Lo que te está frenando",
  confirmedNote: "Fallaste estas dos veces. No es casualidad.",
  candidatesTitle: "Para vigilar",
  candidatesNote: "Una sola vez. Puede ser un despiste.",
  noHoles: "No encontré huecos claros. Bien hecho.",
  offerTitle: "El Círculo",
  offerBody:
    "Ocho clases en vivo al mes, en grupo pequeño, justo en tu nivel. Atacamos exactamente esto.",
  offerCta: "Ver el Círculo",
  emailTitle: "¿Te mando tu resultado?",
  emailNote: "Te lo envío para que no lo pierdas. Nada de spam.",
  emailLabel: "Tu email",
  emailCta: "Enviarme el resultado",
  emailSaved: "Listo. Revisa tu correo.",
  emailSkip: "Ahora no",
  reviewTitle: "Tus respuestas",
  reviewYours: "Tu respuesta",
  reviewCorrect: "Correcta",
  reviewNoSe: "Marcaste No sé",
  reviewShowCorrect: "Ver las que acertaste",
  retake: "Hacer la evaluación otra vez",
  loading: "Cargando…",
  error: "Algo salió mal. Intenta de nuevo.",
  retry: "Intentar de nuevo",
  redirecting: "Te llevo al curso para principiantes…",
} as const;

export const openerOptions: { id: Opener; label: string }[] = [
  { id: "no_se_nada", label: "No sé nada" },
  { id: "principiante", label: "Principiante total" },
  { id: "armo_oraciones", label: "Puedo armar oraciones pero me trabo" },
  { id: "converso", label: "Puedo conversar con errores" },
  { id: "pulir", label: "Cómodo pero quiero pulir" },
];

export const trackLabel: Record<Track, string> = {
  beginner: "Principiante",
  pre_int: "Pre-intermedio",
  int: "Intermedio",
  upper: "Intermedio alto",
};

/** [copy] Headline per placed track. Top outcome reads "avanzado". */
export function resultHeadline(outcome: "settled" | "top" | "gentle", track: Track): string {
  if (outcome === "top") return "Tu nivel: avanzado";
  if (outcome === "gentle") return evalUiCopy.resultGentleTitle;
  return `Tu nivel: ${trackLabel[track].toLowerCase()}`;
}
