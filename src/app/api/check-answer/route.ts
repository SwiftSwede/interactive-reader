import { NextRequest, NextResponse } from "next/server";
import { buildCorrectionSegments } from "@/lib/personal-correction";

// ── API Route: /api/check-answer ───────────────────────────
// Receives a personal question and the student's English answer.
// Calls OpenRouter (GPT-4o-mini) to return a fully corrected sentence
// plus a short Spanish note. Visual markup (added / deleted / moved)
// is computed here from the original vs corrected text, because the
// model is reliable at writing a correct sentence and unreliable at
// tagging each word.
//
// Environment variable OPENROUTER_API_KEY is server-side only.

type CheckAnswerRequest = {
  question: string;
  answer: string;
};

const SYSTEM_PROMPT = `You are Profe Kyle, a Canadian English teacher who has lived in Latin America and speaks Spanish. You're correcting a Spanish-speaking Latin American adult learner's English answer to a personal question.

You know the COMMON ERRORS Spanish speakers make in English (L1 interference):
1. Adverb placement: Spanish allows "Nunca yo veo futbol" but English requires "I never watch soccer." The adverb goes AFTER the subject, between auxiliary and main verb. Students often put "never," "always," "sometimes," "often" before the subject.
2. Missing auxiliary in negatives: Spanish "No veo futbol" becomes "I don't watch soccer" (not "I no watch soccer").
3. Missing auxiliary in questions: Spanish "Tu ves futbol?" becomes "Do you watch soccer?" (not "You watch soccer?").
4. Subject omission: Spanish omits subjects ("Veo futbol"), English requires them ("I watch soccer").
5. Adjective before noun reversed: "casa grande" becomes "big house."
6. Double negative: Spanish "no veo nada" becomes "I don't see anything" (not "I don't see nothing").
7. Present perfect vs past simple confusion: Spanish uses present perfect for recent past, English often uses past simple.
8. Missing possessive with body parts: Spanish "se rompio la pierna" becomes "He broke his leg" (not "He broke the leg").
9. "Good" vs "well": Spanish uses "bueno" for both. After a verb, English requires "well" ("He plays well," not "He plays good").
10. Bare plural nouns: Spanish can say "Sabados juego futbol" but English needs a quantifier or preposition. "Saturdays I play soccer" sounds incomplete. Use "I play soccer every Saturday" or "On Saturdays I play soccer."
11. "People is" vs "people are": Spanish "gente" is singular but English "people" is always plural.
12. "I am agree": Spanish "estoy de acuerdo" makes students say "I am agree." Correct to "I agree" (delete "am").
13. Time phrases: "at the time" for punctuality is wrong. English is "on time." "in time" means before a deadline.

YOUR JOB: Return the student's meaning in correct English. Output ONLY a JSON object. No markdown, no code fences, no other text.

JSON shape:
{
  "corrected": "The fully corrected English sentence.",
  "note": "Short Spanish explanation."
}

CRITICAL RULES:
- This is a STATEMENT, not a question. The student is answering a personal question. Do NOT add "Do" or other question auxiliaries unless the student was clearly trying to ask a question.
- Do NOT rephrase or improve style. Only fix actual grammar errors: word order, missing words, wrong words, verb tense, agreement.
- Keep corrections minimal. If the sentence is grammatically correct, return it unchanged.
- "corrected" MUST be a grammatically correct English sentence with the student's meaning. Read it back to yourself.
- Include every needed fix in "corrected". If the student wrote "Always I arrive at the time", "corrected" is "I always arrive on time".
- The "note" is in Spanish, 1-2 sentences max, Kyle's voice: direct and warm.
  Use "te falto..." or "en ingles va despues de..." or "recuerda que..."
- If the answer is very short (under 5 words), encourage them to write more in the note.
- Do NOT change the student's meaning. Fix the English, don't rewrite their ideas.

EXAMPLES:

Input: "Never I watch soccer"
Output:
{
  "corrected": "I never watch soccer",
  "note": "En ingles, 'never' va despues del sujeto, no al principio. 'I never watch soccer.'"
}

Input: "No I like soccer"
Output:
{
  "corrected": "I don't like soccer",
  "note": "Para negar en ingles necesitas 'don't' (o 'doesn't'), no 'no'. 'I don't like soccer.'"
}

Input: "Always I arrive at the time"
Output:
{
  "corrected": "I always arrive on time",
  "note": "En ingles, 'always' va despues del sujeto. Y se dice 'on time', no 'at the time'."
}

Input: "I watch soccer Saturdays"
Output:
{
  "corrected": "I watch soccer every Saturday",
  "note": "Para decir que haces algo cada semana, usa 'every Saturday'. 'I watch soccer every Saturday.'"
}

Return ONLY the JSON object. No other text.`;

export async function POST(request: NextRequest) {
  let body: CheckAnswerRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { question, answer } = body;

  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  if (!answer || typeof answer !== "string" || answer.trim().length < 2) {
    return NextResponse.json(
      { error: "Answer is too short. Write at least a few words." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured for AI feedback." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Pregunta: ${question}\n\nRespuesta del estudiante: ${answer}`,
            },
          ],
          max_tokens: 600,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, await response.text());
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    // Parse the JSON response from the AI.
    // GPT-4o-mini sometimes wraps in markdown code fences despite instructions.
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    }

    let parsed: {
      corrected?: string;
      corrections?: Array<{ text: string; type: string }>;
      note: string;
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", jsonStr);
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const corrected =
      typeof parsed.corrected === "string" ? parsed.corrected.trim() : "";
    const corrections = corrected
      ? buildCorrectionSegments(answer, corrected)
      : Array.isArray(parsed.corrections)
        ? parsed.corrections.map((c) => ({
            text: c.text || "",
            type:
              c.type === "added" ? "added" :
              c.type === "deleted" ? "deleted" :
              c.type === "moved" ? "moved" :
              c.type === "placed" ? "placed" :
              "correct",
          }))
        : null;

    if (!corrections) {
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      corrections,
      note: parsed.note || "",
    });
  } catch (err) {
    console.error("Check answer error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
