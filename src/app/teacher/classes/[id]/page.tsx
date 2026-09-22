import { parseConversationQuestions } from "@/lib/conversation";
import { examItemCounts } from "@/lib/exam";
import {
  isCopyableConversation,
  isCopyableExam,
  isCopyableWriting,
} from "@/lib/catalog-crud";
import type { CourseLevel } from "@/types";
import CourseRoster from "./CourseRoster";
import ClassStrip, {
  type ClassStripItem,
} from "@/components/teacher/ClassStrip";
import DeleteCourseButton from "./DeleteCourseButton";
import CourseThemeForm from "@/components/teacher/CourseThemeForm";
import CourseWorkspace from "@/components/teacher/CourseWorkspace";
import NewClassButton from "@/components/teacher/NewClassButton";
import ZoomUrlForm from "./ZoomUrlForm";
import ClassDayCard from "@/components/dashboard/ClassDayCard";
import { TEACHER_APP_LABEL } from "@/components/dashboard/JoinCard";
import {
  isLiveOnlySessionType,
  sessionTypeLabel,
  teacherJoinAppHref,
} from "@/lib/activities";
import { getClassDayPhase } from "@/lib/session-phase";
import { areAnswersUnlocked } from "@/lib/sessions";
import {
  courseLevelLabel,
  getOwnedCourse,
  loadCourseRoster,
  loadCourseSessions,
  pickTodayTeacherSession,
  sessionContentStatus,
  sessionRecordingStatus,
  sessionTitle,
  type AttendanceMark,
} from "@/lib/teacher";

export const metadata = {
  title: "Clases - Profe Kyle",
};

type StoryOption = {
  id: string;
  title: string;
  kind?: string | null;
};

export default async function CourseClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { course, supabase } = await getOwnedCourse(id);

  const [
    { data: storyRows },
    { data: writingRows },
    { data: examRows },
    { data: conversationRows },
    { data: presentationRows },
  ] = await Promise.all([
    supabase
      .from("stories")
      .select("id, title, kind")
      .eq("level", course.level)
      .order("title"),
    supabase
      .from("writing_prompts")
      .select("id, title, prompt_text")
      .eq("level", course.level)
      .order("title"),
    supabase
      .from("exam_prompts")
      .select(
        "id, title, vocabulary_list, fill_in_translation, paragraph_restructuring, sentence_correction, translation_sentences"
      )
      .eq("level", course.level)
      .order("title"),
    supabase
      .from("conversation_prompts")
      .select("id, title, questions")
      .eq("level", course.level)
      .order("title"),
    course.level === "intermediate"
      ? supabase
          .from("presentation_prompts")
          .select("id, title")
          .eq("level", "intermediate")
          .order("title")
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const stories = (storyRows ?? []) as StoryOption[];

  const writingPrompts = ((writingRows ?? []) as {
    id: string;
    title: string;
    prompt_text: string;
  }[])
    .filter((row) => isCopyableWriting(row.prompt_text ?? ""))
    .map((row) => ({ id: row.id, title: row.title }));

  const examPrompts = ((examRows ?? []) as {
    id: string;
    title: string;
    vocabulary_list: unknown;
    fill_in_translation: unknown;
    paragraph_restructuring: unknown;
    sentence_correction: unknown;
    translation_sentences: unknown;
  }[])
    .filter((row) =>
      isCopyableExam(
        examItemCounts({
          vocabularyList: (row.vocabulary_list as never) ?? [],
          fillInTranslation: (row.fill_in_translation as never) ?? [],
          paragraphRestructuring: (row.paragraph_restructuring as never) ?? null,
          sentenceCorrection: (row.sentence_correction as never) ?? null,
          translationSentences: (row.translation_sentences as never) ?? [],
        })
      )
    )
    .map((row) => ({ id: row.id, title: row.title }));

  const conversationPrompts = (
    (conversationRows ?? []) as {
      id: string;
      title: string;
      questions: unknown;
    }[]
  )
    .map((row) => ({
      id: row.id,
      title: row.title,
      questions: parseConversationQuestions(row.questions),
    }))
    .filter((row) => isCopyableConversation(row.questions.length))
    .map((row) => ({ id: row.id, title: row.title }));

  const presentationPrompts = (presentationRows ?? []) as {
    id: string;
    title: string;
  }[];

  const conversationCopyPrompts =
    course.level === "pre-intermediate"
      ? (
          (conversationRows ?? []) as {
            id: string;
            title: string;
            questions: unknown;
          }[]
        )
          .map((row) => ({
            id: row.id,
            title: row.title,
            questions: parseConversationQuestions(row.questions).map(
              (question) => question.question
            ),
          }))
          .filter((row) => row.questions.length > 0)
      : [];
  const sessions = await loadCourseSessions(supabase, course.id);
  const orderedSessions = [...sessions].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const { students: roster, displayNames } = await loadCourseRoster(
    supabase,
    course.id,
    sessions
  );
  const sessionIds = sessions.map((session) => session.id);

  const { data: attendanceRows } =
    sessionIds.length > 0
      ? await supabase
          .from("session_attendance")
          .select("course_session_id, student_id, attended, first_opened_at")
          .in("course_session_id", sessionIds)
      : { data: [] };

  const nameByStudentId = new Map(Object.entries(displayNames));

  type AttendanceRow = {
    course_session_id: string;
    student_id: string;
    attended: boolean;
    first_opened_at: string | null;
  };

  const attendanceBySession = new Map<
    string,
    Map<string, { attended: boolean; firstOpenedAt: string | null }>
  >();
  const attendedNamesBySession = new Map<string, string[]>();
  for (const row of (attendanceRows ?? []) as AttendanceRow[]) {
    const byStudent =
      attendanceBySession.get(row.course_session_id) ?? new Map();
    byStudent.set(row.student_id, {
      attended: row.attended === true,
      firstOpenedAt: row.first_opened_at ?? null,
    });
    attendanceBySession.set(row.course_session_id, byStudent);

    if (row.attended) {
      const names = attendedNamesBySession.get(row.course_session_id) ?? [];
      names.push(nameByStudentId.get(row.student_id) ?? "Sin nombre");
      attendedNamesBySession.set(row.course_session_id, names);
    }
  }

  for (const names of attendedNamesBySession.values()) {
    names.sort((a, b) => a.localeCompare(b, "es"));
  }

  const resolvedIds = orderedSessions
    .filter(
      (session) =>
        session.sessionType === "video_summary" ||
        session.sessionType === "presentation" ||
        session.sessionType === "movie_talk"
    )
    .map((session) => session.id);
  const busyIds = new Set<string>();
  if (resolvedIds.length > 0) {
    const [videoRows, presentationRows, movieTalkRows] = await Promise.all([
      supabase
        .from("video_summary_free_writes")
        .select("course_session_id")
        .in("course_session_id", resolvedIds),
      supabase
        .from("presentation_responses")
        .select("course_session_id")
        .in("course_session_id", resolvedIds),
      supabase
        .from("comprehension_responses")
        .select("course_session_id")
        .in("course_session_id", resolvedIds),
    ]);
    for (const row of [
      ...(videoRows.data ?? []),
      ...(presentationRows.data ?? []),
      ...(movieTalkRows.data ?? []),
    ] as Array<{ course_session_id: string | null }>) {
      if (row.course_session_id) busyIds.add(row.course_session_id);
    }
  }

  const stripSessions: ClassStripItem[] = orderedSessions.map((session) => {
    const byStudent = attendanceBySession.get(session.id);
    const students: AttendanceMark[] = roster.map((student) => {
      const mark = byStudent?.get(student.studentId);
      return {
        studentId: student.studentId,
        displayName: student.displayName,
        attended: mark?.attended === true,
        firstOpenedAt: mark?.firstOpenedAt ?? null,
      };
    });
    return {
      id: session.id,
      sessionType: session.sessionType,
      title: sessionTitle(session),
      typeLabel: sessionTypeLabel(session.sessionType),
      start: session.start,
      end: session.end,
      classEndedAt: session.classEndedAt,
      notes: session.notes,
      token: session.token,
      storySlug: session.story?.slug ?? null,
      contentStatus: sessionContentStatus(session),
      recordingStatus: sessionRecordingStatus(session.recordingYoutubeUrl),
      recordingYoutubeUrl: session.recordingYoutubeUrl,
      attendedNames: attendedNamesBySession.get(session.id) ?? [],
      unlocked: areAnswersUnlocked({
        answersRevealed: session.answersRevealed,
        sessionStartTime: session.start,
        sessionEndTime: session.end,
        classEndedAt: session.classEndedAt,
      }),
      students,
      canReopen:
        (session.sessionType === "video_summary" ||
          session.sessionType === "presentation" ||
          session.sessionType === "movie_talk") &&
        !busyIds.has(session.id),
      needsContent:
        sessionContentStatus(session) === "Sin contenido" &&
        session.sessionType !== "pronunciation" &&
        session.sessionType !== "flex",
    };
  });

  const todaySession = pickTodayTeacherSession(orderedSessions);
  const todayLiveOnly = todaySession
    ? isLiveOnlySessionType(todaySession.sessionType)
    : false;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-text-primary">{course.name}</h1>
          {course.theme ? (
            <p className="mt-1 text-label-md text-text-secondary">
              {course.theme}
            </p>
          ) : null}
          <p className="mt-1 text-label-sm text-text-muted">
            {courseLevelLabel(course.level as CourseLevel)}
          </p>
          <p className="mt-2 text-body-main text-text-secondary">
            Una clase es un Zoom: una actividad, 90 minutos, un link para el
            chat.
          </p>
        </div>
        <DeleteCourseButton courseId={course.id} courseName={course.name} />
      </div>

      {todaySession ? (
        <ClassDayCard
          sessionStartTime={todaySession.start}
          sessionEndTime={todaySession.end}
          classEndedAt={todaySession.classEndedAt}
          sessionDate={todaySession.sessionDate}
          href={teacherJoinAppHref({
            sessionType: todaySession.sessionType,
            token: todaySession.token,
            courseId: course.id,
            sessionId: todaySession.id,
            conversationPromptId: todaySession.conversationPromptId,
          })}
          zoomHref={course.zoom_url}
          appLabel={TEACHER_APP_LABEL}
          typeLabel={sessionTypeLabel(todaySession.sessionType)}
          courseName={course.name}
          liveOnly={todayLiveOnly}
          initialPhase={getClassDayPhase({
            sessionStartTime: todaySession.start,
            sessionEndTime: todaySession.end,
            classEndedAt: todaySession.classEndedAt,
          })}
        />
      ) : null}

      <CourseThemeForm courseId={course.id} theme={course.theme} />

      <ZoomUrlForm courseId={course.id} zoomUrl={course.zoom_url} />

      <CourseWorkspace
        classes={
          <>
            <div className="mb-4 flex justify-end">
              <NewClassButton
                courseId={course.id}
                courseLevel={course.level as CourseLevel}
                stories={stories}
                presentationPrompts={presentationPrompts}
                conversationCopyPrompts={conversationCopyPrompts}
                writingPrompts={writingPrompts}
                examPrompts={examPrompts}
                conversationPrompts={conversationPrompts}
              />
            </div>
            {orderedSessions.length === 0 ? (
              <p className="text-body-main text-text-muted">
                Todavía no hay clases. Crea la primera.
              </p>
            ) : (
              <ClassStrip
                courseId={course.id}
                courseLevel={course.level as CourseLevel}
                sessions={stripSessions}
                stories={stories}
                presentationPrompts={presentationPrompts}
                conversationCopyPrompts={conversationCopyPrompts}
                writingPrompts={writingPrompts}
                examPrompts={examPrompts}
                conversationPrompts={conversationPrompts}
              />
            )}
          </>
        }
        students={
          <>
            <p className="mb-3 text-body-main text-text-secondary">
              Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
              aquí. Moverlos de grupo no cambia lo que pagan.
            </p>
            <CourseRoster
              courseId={course.id}
              courseLevel={course.level as CourseLevel}
              students={roster}
            />
          </>
        }
      />
    </section>
  );
}
