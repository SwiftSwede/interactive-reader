"use client";

import IpaText from "./IpaText";
import { WEAK_SOUND_MAX } from "@/lib/pronunciation/thresholds";
import type {
  PhonemeEntry,
  PronunciationAssessmentResponse,
  PronunciationTopIssue,
} from "@/lib/pronunciation/types";

function round0(n: number): number {
  return Math.round(n);
}

function joinWordIpa(
  phonemes: PhonemeEntry[] | undefined,
  pick: (entry: PhonemeEntry) => string | undefined
): string {
  return (phonemes ?? [])
    .map((entry) => pick(entry) ?? "")
    .filter((ipa) => ipa.length > 0)
    .join("");
}

function joinSentenceIpa(
  result: PronunciationAssessmentResponse,
  pick: (entry: PhonemeEntry) => string | undefined
): string {
  const words = result.words
    .map((word) => joinWordIpa(word.phonemes, pick))
    .filter((ipa) => ipa.length > 0);
  if (words.length === 0) return "";
  return `/${words.join(" ")}/`;
}

function errorLabel(errorType?: string): string | null {
  if (!errorType || errorType === "None") return null;
  if (errorType === "Omission") return "no lo dijiste";
  if (errorType === "Insertion") return "sono de mas";
  if (errorType === "Mispronunciation") return "sono distinto";
  return errorType;
}

function IpaLine({
  label,
  ipa,
}: {
  label: string;
  ipa: string;
}) {
  if (!ipa) return null;
  return (
    <p className="text-sm text-gray-800 leading-relaxed">
      <span className="font-semibold">{label} </span>
      <IpaText text={ipa} interactive />
    </p>
  );
}

export default function PronunciationDebug({
  result,
  kyleIpa,
  debug = false,
}: {
  result: PronunciationAssessmentResponse;
  kyleIpa?: string;
  debug?: boolean;
}) {
  const expectedIpa = joinSentenceIpa(result, (entry) => entry.phoneme);
  const heardIpa = joinSentenceIpa(
    result,
    (entry) => entry.spokenPhoneme || entry.phoneme
  );
  const hasHeardSounds = result.words.some((word) =>
    (word.phonemes ?? []).some((entry) => Boolean(entry.spokenPhoneme))
  );
  const usedTips = new Set<number>();
  const heardWords =
    result.recognizedText?.trim() ||
    result.words.map((word) => word.word).join(" ");

  const tipForWord = (word: string): PronunciationTopIssue | null => {
    const index = result.topIssues.findIndex(
      (issue, issueIndex) =>
        !usedTips.has(issueIndex) &&
        issue.word.toLowerCase() === word.toLowerCase()
    );
    if (index < 0) return null;
    usedTips.add(index);
    return result.topIssues[index] ?? null;
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left space-y-3">
      <div className="space-y-2">
        <p className="text-sm text-gray-800 leading-relaxed">
          Esto es practica, no un examen. Los numeros son una guia de la IA:
        </p>
        <ul className="text-sm text-gray-800 list-disc pl-5 space-y-1">
          <li>
            <span className="font-semibold">Claridad:</span>{" "}
            {round0(result.overall.accuracy)}
          </li>
          <li>
            <span className="font-semibold">Fluidez:</span>{" "}
            {round0(result.overall.fluency)}
          </li>
          <li>
            <span className="font-semibold">Completitud:</span>{" "}
            {round0(result.overall.completeness)}
          </li>
          {result.overall.prosody != null ? (
            <li>
              <span className="font-semibold">Ritmo:</span>{" "}
              {round0(result.overall.prosody)}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-md bg-white border border-amber-100 p-3 space-y-2">
        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold">Lo que se oyo: </span>
          {heardWords || "No se entendio bien el audio."}
        </p>
        <IpaLine label="IPA de Kyle:" ipa={kyleIpa?.trim() ?? ""} />
        <IpaLine label="IA IPA:" ipa={expectedIpa} />
        {hasHeardSounds ? (
          <IpaLine label="IPA de lo que se oyo:" ipa={heardIpa} />
        ) : null}
        <p className="text-xs text-gray-500 leading-relaxed">
          Lo que se oyo son las palabras que la IA saco de tu audio. El IA IPA es
          como el diccionario espera la oracion. El IPA de lo que se oyo es como
          la IA transcribe los sonidos que hiciste. Toca un sonido para ver el
          video.
        </p>
      </div>

      {result.topIssues.length === 0 ? (
        <p className="text-sm text-gray-800 leading-relaxed">
          Esa oracion se oye bien. Revisa el detalle si quieres ver cada sonido.
        </p>
      ) : (
        <p className="text-xs font-medium text-amber-900">
          Una o dos cosas para practicar, y el detalle de cada palabra:
        </p>
      )}

      <div className="space-y-2">
        {result.words.map((word, index) => {
          const tip = tipForWord(word.word);
          const error = errorLabel(word.errorType);
          return (
            <div
              key={`${word.word}-${index}`}
              className="rounded-md bg-white border border-amber-100 p-3"
            >
              <p className="text-sm text-gray-800">
                <span className="font-semibold">{word.word}</span>
                {" · "}
                {round0(word.accuracy)}
                {error ? ` · ${error}` : ""}
                {debug && word.reasonCodes && word.reasonCodes.length > 0
                  ? ` · ${word.reasonCodes.join(", ")}`
                  : ""}
                {debug && word.coaching && !tip ? (
                  <span className="text-gray-500"> · coached, then filtered</span>
                ) : null}
              </p>
              {word.phonemes && word.phonemes.length > 0 ? (
                <p className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1">
                  {word.phonemes.map((phoneme, phonemeIndex) => {
                    const weak = phoneme.accuracy <= WEAK_SOUND_MAX;
                    const spoken = phoneme.spokenPhoneme;
                    const heardDifferent =
                      Boolean(spoken) && spoken !== phoneme.phoneme;
                    return (
                      <span
                        key={`${phoneme.phoneme}-${phonemeIndex}`}
                        className={
                          weak
                            ? "rounded px-1.5 py-0.5 bg-red-100 text-red-800"
                            : "rounded px-1.5 py-0.5 bg-gray-100 text-gray-600"
                        }
                      >
                        <IpaText text={`/${phoneme.phoneme}/`} interactive />
                        {heardDifferent ? (
                          <>
                            {" → "}
                            <IpaText text={`/${spoken}/`} interactive />
                          </>
                        ) : null}{" "}
                        {round0(phoneme.accuracy)}
                      </span>
                    );
                  })}
                </p>
              ) : null}
              {tip ? (
                <div className="mt-2 space-y-1">
                  {tip.focusIpa ? (
                    <p className="text-sm font-medium text-gray-800">
                      Practica{" "}
                      <IpaText text={`/${tip.focusIpa}/`} interactive />
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {tip.shortWhyEs}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {tip.tipEs}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
