import { NextRequest, NextResponse } from "next/server";

// ── API Route: /api/check-answer ───────────────────────────
// Receives a personal question and the student's English answer.
// Calls OpenRouter (GPT-4o-mini) to give feedback in Spanish
// on grammar, vocabulary, and naturalness. Kyle's voice: direct,
// warm, no jargon. The correct answer is NOT revealed (there is
// no single correct answer for personal questions).
//
// Environment variable OPENROUTER_API_KEY is server-side only.
// It is never exposed to the browser.

type CheckAnswerRequest = {
  question: string;
  answer: string;
};

const SYSTEM_PROMPT = `You are Profe Kyle, a Canadian English teacher who has lived in Latin America and speaks Spanish. You're giving feedback to a Spanish-speaking Latin American adult learner who is practicing English.

Your job: read the student's answer to a personal question and give brief, helpful feedback.

Rules:
- Write your feedback in SPANISH (the student is learning English, but feedback should be in their language).
- Be direct and warm. No corporate language. No "Great job!" empty praise.
- If the grammar is correct, say so briefly. If there are errors, point them out and explain why.
- Correct vocabulary choices. If they used a word awkwardly, suggest a more natural alternative.
- Comment on naturalness: does this sound like something a native speaker would say?
- Keep it short: 3-5 sentences max. Don't overwhelm.
- Use Kyle's voice: "Te faltó el verbo auxiliar aquí:" not "The auxiliary verb is missing in this sentence."
- If the answer is very short or empty, gently encourage them to write more.
- Do NOT reveal a "correct answer." There is no single correct answer for personal questions.
- Code-switching is fine: mix English and Spanish naturally, like Kyle does.

Format your response as plain text. No markdown headers, no bullet points, no special formatting. Just talk to the student.`;

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
          max_tokens: 300,
          temperature: 0.7,
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
    const feedback = data.choices?.[0]?.message?.content;

    if (!feedback) {
      return NextResponse.json(
        { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ feedback: feedback.trim() });
  } catch (err) {
    console.error("Check answer error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar tu respuesta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
