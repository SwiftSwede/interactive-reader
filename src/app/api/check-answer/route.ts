import { NextRequest, NextResponse } from "next/server";

// ── API Route: /api/check-answer ───────────────────────────
// Receives a personal question and the student's English answer.
// Calls OpenRouter (GPT-4o-mini) to return the corrected text with
// inline markup for additions, deletions, and a short Spanish note.
//
// The AI returns JSON with:
//   - corrections: array of segments, each is { text, type }
//     where type is "correct" | "added" | "deleted"
//   - note: a short Spanish explanation (1-2 sentences, Kyle's voice)
//
// Environment variable OPENROUTER_API_KEY is server-side only.

type CheckAnswerRequest = {
  question: string;
  answer: string;
};

const SYSTEM_PROMPT = `You are Profe Kyle, a Canadian English teacher who has lived in Latin America and speaks Spanish. You're correcting a Spanish-speaking Latin American adult learner's English answer to a personal question.

Your job: return the student's text with inline corrections and a very short note in Spanish.

OUTPUT FORMAT: Return ONLY a JSON object. No markdown, no code fences, no explanation outside the JSON.

The JSON must have this exact shape:
{
  "corrections": [
    { "text": "the student's text or corrected text", "type": "correct" }
  ],
  "note": "One short sentence in Spanish explaining the main error or confirming correctness."
}

The "corrections" array reconstructs the student's answer word by word, but with corrections marked:
- type "correct": text that is fine as-is
- type "added": text you are inserting (was missing, needed to be added)
- type "deleted": text the student wrote that should be removed

Rules:
- Keep corrections minimal. Only fix actual errors (grammar, word order, missing words, wrong words).
- Do NOT rewrite the sentence to be "better" if it's already grammatically correct.
- Each correction segment should be a word or short phrase, not a whole sentence.
- The "note" should be in Spanish, 1-2 sentences max, in Kyle's voice: direct and warm.
  Example: "Te falto la 's' en 'plays'. Recuerda la tercera persona del singular."
  Example: "Todo esta bien. Tu respuesta es clara y correcta."
- If the answer is very short (under 5 words), encourage them to write more in the note.
- Do NOT change the student's meaning. Fix the English, don't rewrite their ideas.
- Preserve the student's original capitalization and punctuation style unless it's wrong.
- Return ONLY the JSON. No other text.`;

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
          max_tokens: 500,
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

    let parsed: { corrections: Array<{ text: string; type: string }>; note: string };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response as JSON:", jsonStr);
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    // Validate structure
    if (!parsed.corrections || !Array.isArray(parsed.corrections)) {
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      corrections: parsed.corrections.map((c) => ({
        text: c.text || "",
        type: c.type === "added" ? "added" : c.type === "deleted" ? "deleted" : "correct",
      })),
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
