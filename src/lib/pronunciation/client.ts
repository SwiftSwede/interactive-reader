import type { PronunciationAssessmentResponse } from "./types";

export async function assessPronunciation(params: {
  audioBlob: Blob;
  referenceText: string;
  locale?: string;
}): Promise<PronunciationAssessmentResponse> {
  const form = new FormData();
  form.append("referenceText", params.referenceText);
  if (params.locale) form.append("locale", params.locale);

  const filename = params.audioBlob.type.includes("webm")
    ? "recording.webm"
    : params.audioBlob.type.includes("mp4")
      ? "recording.mp4"
      : "recording.bin";

  form.append("audio", params.audioBlob, filename);

  const response = await fetch("/api/assess", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let message = "Algo salio mal. Intenta de nuevo.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as PronunciationAssessmentResponse;
}
