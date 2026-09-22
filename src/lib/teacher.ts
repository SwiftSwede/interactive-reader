export { isAutoMarked } from "./attendance";
export {
  courseMonthKey,
  currentYearMonth,
  formatDayTimePattern,
  isCourseInCurrentOrFutureMonth,
  isCourseInMonth,
  monthLabelFromYearMonth,
  sessionsInMonth,
  yearMonthFromIso,
} from "./teacher-month";

export type {
  AttendanceMark,
} from "./teacher/attendance";
export { setSessionAttendance } from "./teacher/attendance";

export type {
  ConversationPromptRef,
  CurrentSession,
  CurrentSessionKind,
  ExamPromptRef,
  OwnedCourse,
  PresentationPromptRef,
  StoryRef,
  TeacherSession,
  WritingPromptRef,
} from "./teacher/sessions";
export {
  SESSION_SELECT,
  currentSessionKindLabel,
  getOwnedCourse,
  loadCourseSessions,
  loadSessionsForCourses,
  mapSessionRow,
  pickCurrentSession,
  pickTodayTeacherSession,
  readinessLabel,
  readySessionCount,
  sessionContentStatus,
  sessionRecordingStatus,
  sessionTitle,
  setSessionRecordingUrl,
} from "./teacher/sessions";

export type {
  CourseRosterResult,
  RosterStudent,
  StudentCurrentGroup,
  TeacherCourseRow,
} from "./teacher/groups-students";
export {
  countActiveStudentsByCourse,
  courseLevelLabel,
  loadCourseRoster,
  loadTeacherCourses,
  mapStudentsToCurrentGroup,
  studentCountLabel,
} from "./teacher/groups-students";

export type {
  ExamGroupRow,
  ExamSubmissionRow,
  LookedUpWord,
  SessionStudentStatus,
  StudentLookup,
  VideoSummaryFreeWriteRow,
  WritingCorrectionRow,
  WritingSubmissionRow,
} from "./teacher/analytics";
export {
  loadExamGroups,
  loadExamSubmissions,
  loadLookedUpWords,
  loadSessionStudentStatus,
  loadStudentLookups,
  loadVideoSummaryFreeWrites,
  loadWritingCorrection,
  loadWritingSubmissions,
} from "./teacher/analytics";
