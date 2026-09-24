import { NextResponse } from "next/server";
import { saveExamAnswers } from "@/app/exam/actions";
import { saveExamClassAnswers } from "@/app/exam/exam-teacher-actions";
import { parseExamClassAnswers } from "@/lib/exam";

/**
 * Draft saves stay on the API so typing does not trigger a Server Action
 * refresh that remounts the exam with a stale payload.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Esas respuestas no se pudieron guardar." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Esas respuestas no se pudieron guardar." },
      { status: 400 }
    );
  }

  const payload = body as { kind?: unknown };
  if (payload.kind === "class") {
    const row = body as { sessionId?: unknown; answers?: unknown };
    if (typeof row.sessionId !== "string") {
      return NextResponse.json(
        { ok: false, error: "No pude guardar las respuestas." },
        { status: 400 }
      );
    }
    const result = await saveExamClassAnswers(
      row.sessionId,
      parseExamClassAnswers(row.answers)
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = await saveExamAnswers(body as never);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
