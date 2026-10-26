"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTeacherPanel } from "./TeacherPanelContext";
import SessionContextPanel from "./SessionContextPanel";
import TeacherSessionRow from "./TeacherSessionRow";
import SessionContentDialog from "./SessionContentDialog";
import {
  isLiveOnlySessionType,
  isStoryBackedSessionType,
  studentSessionPath,
  type SessionType,
} from "@/lib/activities";
import type { AttendanceMark } from "@/lib/teacher";
import type { CourseLevel } from "@/types";

const SELECTED_SESSION_PARAM = "clase";

function writeSelectedSessionId(sessionId: string | null) {
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set(SELECTED_SESSION_PARAM, sessionId);
  else url.searchParams.delete(SELECTED_SESSION_PARAM);
  window.history.replaceState(
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

export type ClassStripItem = {
  id: string;
  sessionType: SessionType;
  title: string;
  typeLabel: string;
  start: string;
  end: string;
  classEndedAt: string | null;
  notes: string | null;
  token: string;
  storySlug: string | null;
  contentStatus: string;
  recordingYoutubeUrl: string | null;
  attendedCount: number;
  isToday: boolean;
  started: boolean;
  ended: boolean;
  unlocked: boolean;
  students: AttendanceMark[];
  canReopen: boolean;
  needsContent: boolean;
};

type CatalogOption = { id: string; title: string };
type StoryOption = { id: string; title: string; kind?: string | null };
type ConversationCopyOption = {
  id: string;
  title: string;
  questions: string[];
};

export default function ClassStrip({
  courseId,
  courseLevel,
  sessions,
  stories,
  presentationPrompts,
  conversationCopyPrompts,
  writingPrompts,
  examPrompts,
  conversationPrompts,
}: {
  courseId: string;
  courseLevel: CourseLevel;
  sessions: ClassStripItem[];
  stories: StoryOption[];
  presentationPrompts: CatalogOption[];
  conversationCopyPrompts: ConversationCopyOption[];
  writingPrompts: CatalogOption[];
  examPrompts: CatalogOption[];
  conversationPrompts: CatalogOption[];
}) {
  const { setPanel } = useTeacherPanel();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get(SELECTED_SESSION_PARAM);
  const selected =
    sessions.find((session) => session.id === urlSessionId) ?? null;
  const selectedId = selected?.id ?? null;

  const contentDialog = useCallback(
    (
      session: ClassStripItem,
      mode: "assign" | "flex",
      triggerLabel: string
    ) => (
      <SessionContentDialog
        courseId={courseId}
        courseLevel={courseLevel}
        sessionId={session.id}
        sessionType={session.sessionType}
        mode={mode}
        stories={stories}
        presentationPrompts={presentationPrompts}
        conversationCopyPrompts={conversationCopyPrompts}
        writingPrompts={writingPrompts}
        examPrompts={examPrompts}
        conversationPrompts={conversationPrompts}
        triggerLabel={triggerLabel}
      />
    ),
    [
      courseId,
      courseLevel,
      stories,
      presentationPrompts,
      conversationCopyPrompts,
      writingPrompts,
      examPrompts,
      conversationPrompts,
    ]
  );

  useEffect(() => {
    setPanel(
      selected ? (
        <SessionContextPanel
          courseId={courseId}
          sessionId={selected.id}
          title={selected.title}
          typeLabel={selected.typeLabel}
          start={selected.start}
          end={selected.end}
          classEndedAt={selected.classEndedAt}
          liveOnly={isLiveOnlySessionType(selected.sessionType)}
          recordingYoutubeUrl={selected.recordingYoutubeUrl}
          students={selected.students}
          notes={selected.notes}
          studentHref={studentSessionPath({
            sessionType: selected.sessionType,
            token: selected.token,
            storySlug: selected.storySlug,
          })}
          answers={
            isStoryBackedSessionType(selected.sessionType)
              ? selected.unlocked
                ? "unlocked"
                : "locked"
              : null
          }
          contentAction={
            selected.sessionType !== "flex" && selected.canReopen
              ? contentDialog(selected, "flex", "Cambiar tipo")
              : null
          }
        />
      ) : null,
      () => writeSelectedSessionId(null)
    );
    return () => setPanel(null);
  }, [courseId, selected, setPanel, contentDialog]);

  return (
    <ul className="divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
      {sessions.map((session, index) => (
        <TeacherSessionRow
          key={session.id}
          courseId={courseId}
          classNumber={index + 1}
          sessionId={session.id}
          sessionType={session.sessionType}
          title={session.title}
          typeLabel={session.typeLabel}
          start={session.start}
          token={session.token}
          storySlug={session.storySlug}
          contentStatus={session.contentStatus}
          hasRecording={Boolean(session.recordingYoutubeUrl)}
          attendedCount={session.attendedCount}
          rosterCount={session.students.length}
          isToday={session.isToday}
          started={session.started}
          ended={session.ended}
          selected={session.id === selectedId}
          contentAction={
            session.sessionType === "flex"
              ? contentDialog(session, "flex", "Por elegir")
              : session.needsContent
                ? contentDialog(session, "assign", "Elegir contenido")
                : null
          }
          onSelect={() =>
            writeSelectedSessionId(selectedId === session.id ? null : session.id)
          }
        />
      ))}
    </ul>
  );
}
