import Link from "next/link";
import { areAnswersUnlocked } from "@/lib/sessions";
import CopySessionLink from "@/app/teacher/classes/[id]/CopySessionLink";
import DeleteSessionButton from "@/app/teacher/classes/[id]/DeleteSessionButton";
import UnlockAnswersButton from "@/app/teacher/classes/[id]/UnlockAnswersButton";
import LocalDateTime from "@/components/LocalDateTime";
import { sessionTitle, type TeacherSession } from "@/lib/teacher";
import { studentSessionPath } from "@/lib/activities";

function attendanceLabel(names: string[]): string {
  if (names.length === 0) return "Nadie ha entrado todavía.";
  return `Asistieron: ${names.length}`;
}

export default function TeacherSessionRow({
  courseId,
  session,
  attendedNames,
}: {
  courseId: string;
  session: TeacherSession;
  attendedNames: string[];
}) {
  const unlocked = areAnswersUnlocked({
    answersRevealed: session.answersRevealed,
    sessionEndTime: session.end,
  });
  const studentHref = studentSessionPath({
    sessionType: session.sessionType,
    token: session.token,
    storySlug: session.story?.slug,
  });

  return (
    <li className="px-4 py-4">
      <Link
        href={`/teacher/classes/${courseId}/sessions/${session.id}`}
        className="block"
      >
        <p className="text-label-md text-text-primary hover:underline">
          {sessionTitle(session)}
        </p>
        <LocalDateTime iso={session.start} />
      </Link>
      {session.notes ? (
        <p className="mt-1 text-label-sm text-text-secondary">{session.notes}</p>
      ) : null}
      <p className="mt-1 text-label-sm text-text-secondary">
        {attendanceLabel(attendedNames)}
      </p>
      {attendedNames.length > 0 ? (
        <p className="mt-0.5 break-words text-label-sm text-text-muted">
          {attendedNames.join(", ")}
        </p>
      ) : null}
      {session.sessionType === "story" ? (
        unlocked ? (
          <p className="mt-2 text-label-sm text-text-muted">
            Respuestas desbloqueadas.
          </p>
        ) : (
          <div className="mt-2">
            <UnlockAnswersButton courseId={courseId} sessionId={session.id} />
          </div>
        )
      ) : null}
      <div className="mt-2 grid grid-cols-2 items-stretch gap-2">
        {studentHref ? <CopySessionLink href={studentHref} /> : <span />}
        <DeleteSessionButton courseId={courseId} sessionId={session.id} />
      </div>
    </li>
  );
}
