import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOwnedCourse,
  loadCourseRoster,
  loadCourseSessions,
  loadWritingCorrection,
  loadWritingSubmissions,
} from "@/lib/teacher";
import WritingCorrectionEditor from "./WritingCorrectionEditor";

export const metadata = {
  title: "Corrección - Profe Kyle",
};

export default async function WritingSubmissionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string; submissionId: string }>;
}) {
  const { id, sessionId, submissionId } = await params;
  const { course, supabase } = await getOwnedCourse(id);
  const sessions = await loadCourseSessions(supabase, course.id);
  const session = sessions.find((row) => row.id === sessionId);
  if (!session || session.sessionType !== "writing") {
    notFound();
  }

  const [submissions, { students: roster, displayNames }, correction] =
    await Promise.all([
      loadWritingSubmissions(supabase, session.id),
      loadCourseRoster(supabase, course.id, sessions),
      loadWritingCorrection(supabase, submissionId),
    ]);
  const submission = submissions.find((row) => row.id === submissionId);
  if (!submission) {
    notFound();
  }

  const studentName =
    roster.find((row) => row.studentId === submission.userId)?.displayName ??
    displayNames[submission.userId] ??
    "Sin nombre";

  return (
    <section className="mx-auto max-w-md px-4 py-10 md:max-w-2xl">
      <p className="text-sm text-gray-500">
        <Link
          href={`/teacher/classes/${course.id}/sessions/${session.id}`}
          className="underline-offset-2 hover:text-gray-800 hover:underline"
        >
          {session.writingPrompt?.title || "Escritura"}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{studentName}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {submission.wordCount} palabras
        {session.writingPrompt?.level === "pre-intermediate" && submission.wpm
          ? ` · ${submission.wpm} ppm`
          : ""}
      </p>

      <WritingCorrectionEditor
        courseId={course.id}
        sessionId={session.id}
        submissionId={submission.id}
        originalText={submission.submissionText}
        initialCorrectedText={
          correction?.correctedText ?? submission.submissionText
        }
        initialNotes={correction?.inlineNotes ?? []}
        initialGoodVocabulary={correction?.goodVocabulary ?? []}
        initialDiff={correction?.correctionDiff ?? null}
        studentLink={`/writing?session=${session.token}`}
      />
    </section>
  );
}
