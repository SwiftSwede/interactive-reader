import type { PronunciationWordNote, SoundVideo } from "@/types";

function sound(
  symbol: string,
  ipa: string,
  name: string,
  description: string,
  examples: string[],
  ipaAliases: string[] = [],
  durationSeconds = 180
): SoundVideo {
  return {
    symbol,
    ipa,
    ipaAliases,
    name,
    bunnyVideoId: "",
    durationSeconds,
    description,
    examples,
    course: "sounds",
  };
}

// Full General American inventory. The original ~15 videos (Spanish-speaker
// trouble sounds) keep Kyle's names. The rest are placeholders until those
// Bunny GUIDs are added. Every phoneme in a transcription should resolve here.
export const SOUND_VIDEO_CATALOG: SoundVideo[] = [
  sound("i", "ɪ", "Short I", "The relaxed short i in sit, ship, bit.", [
    "sit",
    "ship",
    "bit",
  ]),
  sound(
    "ee",
    "iː",
    "Long E",
    "The tense long e in seat, sheep, beat.",
    ["seat", "sheep", "need"],
    ["i"]
  ),
  sound("e", "ɛ", "Short E", "The short e in bed, red, mess.", [
    "bed",
    "red",
    "mess",
  ]),
  sound("a", "æ", "Short A", "The short a in cat, bag, apple.", [
    "cat",
    "bag",
    "apple",
  ]),
  sound(
    "ä",
    "ɑ",
    "Listerine Vowel",
    "The open vowel in not, want, lot, walk, thought, off.",
    ["not", "want", "lot", "walk", "thought"],
    ["ɑː", "ɔ", "ɔː", "ɒ"]
  ),
  sound("ö", "ʌ", "Short U", "The short u in but, luck, what.", [
    "but",
    "luck",
    "what",
  ]),
  sound("ë", "ə", "Schwa", "The reduced vowel in a lot of commas.", [
    "of",
    "a",
    "the",
  ]),
  sound("ü", "ʊ", "Angry Monkey", "The vowel in book, would, put, look.", [
    "book",
    "would",
    "put",
  ]),
  sound(
    "oo",
    "uː",
    "Long U",
    "The long u in food, too, blue.",
    ["food", "too", "blue"],
    ["u"]
  ),
  sound(
    "ör",
    "ɝ",
    "Dog RRRRRRR",
    "The r-colored vowel in fur, learn, sir.",
    ["fur", "learn", "sir"],
    ["ɚ", "ər", "ɜr", "ɜː"],
    210
  ),
  sound(
    "ay",
    "eɪ",
    "AY",
    "The diphthong in say, day, name.",
    ["say", "day", "name"],
    ["e"]
  ),
  sound("ai", "aɪ", "AI", "The diphthong in my, time, like.", [
    "my",
    "time",
    "like",
  ]),
  sound("oy", "ɔɪ", "OY", "The diphthong in boy, toy, noise.", [
    "boy",
    "toy",
    "noise",
  ]),
  sound("ow", "aʊ", "OW", "The diphthong in now, house, out.", [
    "now",
    "house",
    "out",
  ]),
  sound(
    "oh",
    "oʊ",
    "OH",
    "The diphthong in most, go, boat. Two sounds: O then U.",
    ["most", "go", "boat"],
    ["əʊ"]
  ),
  sound(
    "yu",
    "juː",
    "YU",
    "The you-glide in you, music, cute.",
    ["you", "music", "cute"],
    ["ju"]
  ),
  sound(
    "ar",
    "ɑɹ",
    "AR",
    "The r-colored vowel in car, far, start.",
    ["car", "far", "start"],
    ["ɑr"]
  ),
  sound(
    "or",
    "ɔɹ",
    "OR",
    "The r-colored vowel in more, wore, four.",
    ["more", "wore", "four"],
    ["ɔr"]
  ),
  sound(
    "air",
    "ɛɹ",
    "AIR",
    "The r-colored vowel in their, air, care.",
    ["their", "air", "care"],
    ["ɛr", "eɹ"]
  ),
  sound(
    "ear",
    "ɪɹ",
    "EAR",
    "The r-colored vowel in near, here, beer.",
    ["near", "here", "beer"],
    ["ɪr", "ɪə"]
  ),
  sound(
    "ure",
    "ʊɹ",
    "URE",
    "The r-colored vowel in tour and sure.",
    ["tour", "sure"],
    ["ʊr"]
  ),
  sound("p", "p", "P", "The P in put, stop, people.", ["put", "stop", "people"]),
  sound("b", "b", "B", "The B in boy, cab, baby.", ["boy", "cab", "baby"]),
  sound("t", "t", "T", "The T in top, cat, water.", ["top", "cat", "water"]),
  sound("d", "d", "D", "The D in day, kid, made.", ["day", "kid", "made"]),
  sound("k", "k", "K", "The K in cat, back, school.", ["cat", "back", "school"]),
  sound("g", "g", "G", "The G in go, big, give.", ["go", "big", "give"], ["ɡ"]),
  sound("f", "f", "F", "The F in fun, leaf, coffee.", ["fun", "leaf", "coffee"]),
  sound("v", "v", "Viper V", "English V, not a Spanish B.", [
    "viper",
    "very",
    "have",
  ]),
  sound("th", "θ", "TH without vibration", "The voiceless TH in thing, nothing, both.", [
    "thing",
    "nothing",
    "both",
  ]),
  sound("dz", "ð", "TH with vibration", "The voiced TH in this, that, those.", [
    "this",
    "that",
    "the",
  ]),
  sound("s", "s", "S", "The S in sit, miss, city.", ["sit", "miss", "city"]),
  sound("z", "z", "English Z", "The buzzing S/Z in kids, loves, bridges.", [
    "kids",
    "loves",
    "is",
  ]),
  sound("sh", "ʃ", "SH", "The SH in she, fish, nation.", [
    "she",
    "fish",
    "nation",
  ]),
  sound("zh", "ʒ", "ZH", "The ZH in vision, measure, beige.", [
    "vision",
    "measure",
    "beige",
  ]),
  sound("h", "h", "H", "The H in hat, hello, who.", ["hat", "hello", "who"]),
  sound("ch", "tʃ", "CH", "The CH in chair, watch, church.", [
    "chair",
    "watch",
    "church",
  ]),
  sound("dy", "dʒ", "English J", "The J sound in Jill, jump, jersey.", [
    "Jill",
    "jump",
    "jersey",
  ]),
  sound("m", "m", "M", "The M in me, time, summer.", ["me", "time", "summer"]),
  sound("n", "n", "N", "The N in no, sun, funny.", ["no", "sun", "funny"]),
  sound("ng", "ŋ", "NG", "The NG in sing, think, long.", [
    "sing",
    "think",
    "long",
  ]),
  sound("l", "l", "L", "The light L in like, love, light.", [
    "like",
    "love",
    "light",
  ]),
  sound(
    "...l",
    "ɫ",
    "Dark L",
    "The dark L in girl, will, fill, world.",
    ["girl", "will", "world"],
    ["l̩"]
  ),
  sound("r", "ɹ", "R", "The English R in red, right, very.", [
    "red",
    "right",
    "very",
  ], ["r"]),
  sound("w", "w", "W", "The W in we, went, always.", ["we", "went", "always"]),
  sound("y", "j", "Y", "The Y in yes, you, yellow.", ["yes", "you", "yellow"]),
  sound("'", "ʔ", "Glottal Stop", "The catch in tha button, mountain, Manhattan.", [
    "button",
    "mountain",
  ]),
];

export const SOCCER_JERSEY_CORAL_STANDARD =
  "Most of the other kids wore their Messi jersey.";

export const SOCCER_JERSEY_CORAL_IPA =
  "/moʊst əv ði ˈʌðər kɪdz wɔɹ ðɛɹ ˈmɛsi ˈdʒɝzi/";

export const SOCCER_JERSEY_WORD_NOTES: PronunciationWordNote[] = [
  {
    word: "Most",
    note: "El sonido O en ingles es un diptongo, no un sonido simple como en espanol. Tienen que ser dos sonidos juntos: O-U. Si lo pronuncias como la O del espanol, sonara raro.",
  },
  {
    word: "Of",
    note: "Antes de una palabra que empieza con consonante, se reduce a solo la schwa. Por eso suena mosta, no most of.",
  },
  {
    word: "The",
    note: "La vocal de the normalmente se reduce, pero aqui, como la siguiente palabra empieza con vocal, suena como thee. Ademas, para no hacer una pausa entre thee y other, anadimos una Y que conecta las dos palabras. Suena the-y-other. El th tiene vibracion, no es como la z del espanol.",
  },
  {
    word: "Kids",
    note: "La S final suena como Z, no como S. La I de kids es una I corta, como en bit.",
  },
  {
    word: "Wore",
    note: "Igual que most, asegurate de que sea un diptongo: O-U. Si pronuncias la O como en espanol, sonara ligeramente mal.",
  },
  {
    word: "Their",
    note: "Igual que the, el th tiene vibracion. Messi se pronuncia igual en ingles y espanol.",
  },
  {
    word: "Jersey",
    note: "Empieza con el sonido suave de la G (como en jinete). No pronuncies la primera E como si fuera una E del espanol. La S final suena como Z, y termina en un sonido de E.",
  },
];
