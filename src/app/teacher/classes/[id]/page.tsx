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
import DayTimePattern from "@/components/teacher/DayTimePattern";
import GroupTodayBand from "@/components/teacher/GroupTodayBand";
import TeacherPageHeader from "@/components/teacher/TeacherPageHeader";
import { toGroupToday } from "@/components/teacher/group-today";
import { sessionTypeLabel } from "@/lib/activities";
import { areAnswersUnlocked } from "@/lib/sessions";
import {
  courseLevelLabel,
  getOwnedCourse,
  loadCourseRoster,
  loadCourseSessions,
  pickTodayTeacherSession,
  sessionContentStatus,
  sessionTiming,
  sessionTitle,
  studentCountLabel,
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
  const { students: roster } = await loadCourseRoster(
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
  for (const row of (attendanceRows ?? []) as AttendanceRow[]) {
    const byStudent =
      attendanceBySession.get(row.course_session_id) ?? new Map();
    byStudent.set(row.student_id, {
      attended: row.attended === true,
      firstOpenedAt: row.first_opened_at ?? null,
    });
    attendanceBySession.set(row.course_session_id, byStudent);
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

  const todaySession = pickTodayTeacherSession(orderedSessions);

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
      recordingYoutubeUrl: session.recordingYoutubeUrl,
      attendedCount: students.filter((student) => student.attended).length,
      isToday: session.id === todaySession?.id,
      ...sessionTiming(session),
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

  return (
    <section>
      <TeacherPageHeader
        title={course.name}
        description={
          <>
            {courseLevelLabel(course.level as CourseLevel)}
            <DayTimePattern
              prefix=" · "
              starts={orderedSessions.map((session) => session.start)}
            />
            {" · "}
            {studentCountLabel(roster.length)}
          </>
        }
        action={
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
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-2">
        <CourseThemeForm courseId={course.id} theme={course.theme} />
        <ZoomUrlForm courseId={course.id} zoomUrl={course.zoom_url} />
      </div>

      {todaySession ? (
        <div className="mt-6">
          <GroupTodayBand today={toGroupToday(course, todaySession)} standalone />
        </div>
      ) : null}

      <CourseWorkspace
        classes={
          <>
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
            <p className="mb-4 text-label-sm text-text-muted">
              Solo quienes siguen pagando. Si pausaron en ThriveCart, no salen
              aquí. Moverlos de grupo no cambia lo que pagan.
            </p>
            <CourseRoster courseId={course.id} students={roster} />
          </>
        }
      />

      <div className="mt-12 border-t border-paper-line pt-4">
        <DeleteCourseButton courseId={course.id} courseName={course.name} />
      </div>
    </section>
  );
}
