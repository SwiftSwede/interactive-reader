"use client";

import { useEffect, useState } from "react";
import { useTeacherPanel } from "./TeacherPanelContext";
import SessionContextPanel from "./SessionContextPanel";
import TeacherSessionRow from "./TeacherSessionRow";
import { isLiveOnlySessionType, type SessionType } from "@/lib/activities";
import type { AttendanceMark } from "@/lib/teacher";

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
  notes: string | null;
  token: string;
  storySlug: string | null;
  contentStatus: string;
  recordingStatus: string;
  recordingYoutubeUrl: string | null;
  attendedNames: string[];
  unlocked: boolean;
  students: AttendanceMark[];
};

export default function ClassStrip({
  courseId,
  sessions,
}: {
  courseId: string;
  sessions: ClassStripItem[];
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
