import {
  isLiveOnlySessionType,
  sessionTypeLabel,
  teacherJoinAppHref,
} from "@/lib/activities";
import { getClassDayPhase } from "@/lib/session-phase";
import { sessionTitle, type TeacherSession } from "@/lib/teacher";
import type { GroupToday } from "./GroupTodayBand";
import { teacherClassHref } from "./teacher-ui";

export function toGroupToday(
  course: { id: string; zoom_url: string | null },
  session: TeacherSession
): GroupToday {
  return {
    sessionId: session.id,
    sessionStartTime: session.start,
    sessionEndTime: session.end,
    classEndedAt: session.classEndedAt,
    typeLabel: sessionTypeLabel(session.sessionType),
    title: sessionTitle(session),
    appHref: isLiveOnlySessionType(session.sessionType)
      ? null
      : teacherJoinAppHref({
          sessionType: session.sessionType,
          token: session.token,
          courseId: course.id,
          sessionId: session.id,
          conversationPromptId: session.conversationPromptId,
        }),
    zoomHref: course.zoom_url,
    classHref: teacherClassHref(course.id, session.id),
    recordingMissing: !session.recordingYoutubeUrl,
    initialPhase: getClassDayPhase({
      sessionStartTime: session.start,
      sessionEndTime: session.end,
      classEndedAt: session.classEndedAt,
    }),
  };
}
