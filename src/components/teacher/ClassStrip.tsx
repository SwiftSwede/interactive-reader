"use client";

import { useEffect, useState } from "react";
import { useTeacherPanel } from "./TeacherPanelContext";
import SessionContextPanel from "./SessionContextPanel";
import TeacherSessionRow from "./TeacherSessionRow";
import SessionContentDialog from "./SessionContentDialog";
import { isLiveOnlySessionType, type SessionType } from "@/lib/activities";
import type { AttendanceMark } from "@/lib/teacher";
import type { CourseLevel } from "@/types";

const SELECTED_SESSION_PARAM = "clase";

function readSelectedSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(
    SELECTED_SESSION_PARAM
  );
}

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
  recordingStatus: string;
  recordingYoutubeUrl: string | null;
  attendedNames: string[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sessions.find((session) => session.id === selectedId) ?? null;

  useEffect(() => {
    const fromUrl = readSelectedSessionId();
    if (fromUrl && sessions.some((session) => session.id === fromUrl)) {
      setSelectedId(fromUrl);
    }
  }, [courseId]);

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
        />
      ) : null
    );
    return () => setPanel(null);
  }, [courseId, selected, setPanel]);

  return (
    <ul className="overflow-hidden divide-y divide-paper-line rounded-sheet border border-paper-line bg-surface">
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
          notes={session.notes}
          token={session.token}
          storySlug={session.storySlug}
          contentStatus={session.contentStatus}
          recordingStatus={session.recordingStatus}
          attendedNames={session.attendedNames}
          unlocked={session.unlocked}
          selected={session.id === selectedId}
          contentAction={
            session.sessionType === "flex" || session.canReopen ? (
              <SessionContentDialog
                courseId={courseId}
                courseLevel={courseLevel}
                sessionId={session.id}
                sessionType={session.sessionType}
                mode="flex"
                stories={stories}
                presentationPrompts={presentationPrompts}
                conversationCopyPrompts={conversationCopyPrompts}
                writingPrompts={writingPrompts}
                examPrompts={examPrompts}
                conversationPrompts={conversationPrompts}
                triggerLabel={
                  session.sessionType === "flex"
                    ? "Por elegir"
                    : "Cambiar tipo"
                }
              />
            ) : session.needsContent ? (
              <SessionContentDialog
                courseId={courseId}
                courseLevel={courseLevel}
                sessionId={session.id}
                sessionType={session.sessionType}
                mode="assign"
                stories={stories}
                presentationPrompts={presentationPrompts}
                conversationCopyPrompts={conversationCopyPrompts}
                writingPrompts={writingPrompts}
                examPrompts={examPrompts}
                conversationPrompts={conversationPrompts}
                triggerLabel="Elegir contenido"
              />
            ) : null
          }
          onSelect={() => {
            const next = selectedId === session.id ? null : session.id;
            setSelectedId(next);
            writeSelectedSessionId(next);
          }}
        />
      ))}
    </ul>
  );
}
