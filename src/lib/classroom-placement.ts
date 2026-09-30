import { createAdminClient } from "@/lib/supabase/admin";
import { isActiveClassroomSubscription } from "@/lib/classroom-access";
import type { CourseLevel } from "@/types";

export function otherCourseLevel(level: CourseLevel): CourseLevel {
  return level === "pre-intermediate" ? "intermediate" : "pre-intermediate";
}

export async function getClassroomLevel(
  studentId: string
): Promise<CourseLevel | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("classroom_level")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  const level = data.classroom_level;
  if (level === "pre-intermediate" || level === "intermediate") return level;
  return null;
}

export async function seedClassroomLevelIfEmpty(
  studentId: string,
  level: CourseLevel
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("classroom_level")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return;
  if (data.classroom_level) return;

  await admin
    .from("profiles")
    .update({ classroom_level: level })
    .eq("id", studentId)
    .is("classroom_level", null);
}

async function displayNameForStudent(studentId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: enrollment } = await admin
    .from("course_enrollments")
    .select("display_name")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromEnrollment = enrollment?.display_name?.trim();
  if (fromEnrollment) return fromEnrollment;

  const { data: authUser } = await admin.auth.admin.getUserById(studentId);
  const fromMeta =
    typeof authUser.user?.user_metadata?.display_name === "string"
      ? authUser.user.user_metadata.display_name.trim()
      : "";
  if (fromMeta) return fromMeta;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", studentId)
    .maybeSingle();
  return profile?.email?.split("@")[0] ?? "Sin nombre";
}

export async function enrollStudentInUnarchivedLevel(params: {
  studentId: string;
  level: CourseLevel;
  displayName: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from("courses")
    .select("id")
    .eq("level", params.level)
    .eq("archived", false);

  if (error) {
    console.error("enrollStudentInUnarchivedLevel load failed:", error);
    return;
  }

  for (const course of courses ?? []) {
    const { error: insertError } = await admin.from("course_enrollments").insert({
      course_id: course.id,
      student_id: params.studentId,
      display_name: params.displayName,
    });
    if (insertError && insertError.code !== "23505") {
      console.error("enrollStudentInUnarchivedLevel insert failed:", insertError);
    }
  }
}

export async function unenrollStudentFromUnarchivedLevel(params: {
  studentId: string;
  level: CourseLevel;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from("courses")
    .select("id")
    .eq("level", params.level)
    .eq("archived", false);

  if (error || !courses?.length) return;

  const { error: deleteError } = await admin
    .from("course_enrollments")
    .delete()
    .eq("student_id", params.studentId)
    .in(
      "course_id",
      courses.map((course) => course.id)
    );

  if (deleteError) {
    console.error("unenrollStudentFromUnarchivedLevel failed:", deleteError);
  }
}

export async function enrollInClassroomHome(params: {
  studentId: string;
  priceLevel: CourseLevel | null;
  displayName: string;
}): Promise<void> {
  const home = await getClassroomLevel(params.studentId);
  const level = home ?? params.priceLevel;
  if (!level) return;

  if (!home) {
    await seedClassroomLevelIfEmpty(params.studentId, level);
  }

  await enrollStudentInUnarchivedLevel({
    studentId: params.studentId,
    level,
    displayName: params.displayName,
  });
}

export async function moveStudentToClassroomLevel(params: {
  studentId: string;
  toLevel: CourseLevel;
}): Promise<{ enrolledInLiveCourse: boolean }> {
  const displayName = await displayNameForStudent(params.studentId);
  const fromLevel = otherCourseLevel(params.toLevel);
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ classroom_level: params.toLevel })
    .eq("id", params.studentId)
    .eq("role", "student-classroom");

  if (error) {
    throw new Error(error.message);
  }

  await unenrollStudentFromUnarchivedLevel({
    studentId: params.studentId,
    level: fromLevel,
  });
  await enrollStudentInUnarchivedLevel({
    studentId: params.studentId,
    level: params.toLevel,
    displayName,
  });

  const { count } = await admin
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("level", params.toLevel)
    .eq("archived", false);

  return { enrolledInLiveCourse: (count ?? 0) > 0 };
}

export async function enrollMatchingStudentsInCourse(params: {
  courseId: string;
  level: CourseLevel;
}): Promise<number> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, subscription_status")
    .eq("role", "student-classroom")
    .eq("classroom_level", params.level);

  if (error) {
    console.error("enrollMatchingStudentsInCourse load failed:", error);
    return 0;
  }

  const studentIds = (profiles ?? [])
    .filter((row) => isActiveClassroomSubscription(row.subscription_status))
    .map((row) => row.id);

  let enrolled = 0;
  for (const studentId of studentIds) {
    const displayName = await displayNameForStudent(studentId);
    const { error: insertError } = await admin.from("course_enrollments").insert({
      course_id: params.courseId,
      student_id: studentId,
      display_name: displayName,
    });
    if (!insertError || insertError.code === "23505") {
      enrolled += 1;
    } else {
      console.error("enrollMatchingStudentsInCourse insert failed:", insertError);
    }
  }

  return enrolled;
}

export type RemoveClassroomStudentResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "teacher" | "stripe" | "error" };

/** True when Stripe still manages this student (active or paused sub). */
export function isLiveStripeManaged(
  periodStatuses: Array<string | null | undefined>
): boolean {
  return periodStatuses.some(
    (status) => status === "active" || status === "paused"
  );
}

export type EnrollmentCourseRow = {
  courseId: string;
  archived: boolean;
};

export type CourseSessionStartRow = {
  courseId: string;
  sessionStartTime: string;
};

/**
 * Live courses whose first class has not started yet. Alumni keep months
 * they already sat in, including the current month if class has begun.
 */
export function futureLiveCourseIdsToDrop(
  enrollments: EnrollmentCourseRow[],
  sessions: CourseSessionStartRow[],
  now = new Date()
): string[] {
  const nowMs = now.getTime();
  const started = new Set<string>();
  for (const session of sessions) {
    if (new Date(session.sessionStartTime).getTime() <= nowMs) {
      started.add(session.courseId);
    }
  }

  return [
    ...new Set(
      enrollments
        .filter((row) => !row.archived && !started.has(row.courseId))
        .map((row) => row.courseId)
    ),
  ];
}

async function dropFutureLiveEnrollments(studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: enrollmentRows, error: enrollLoadError } = await admin
    .from("course_enrollments")
    .select("course_id, courses ( archived )")
    .eq("student_id", studentId);

  if (enrollLoadError) {
    console.error("dropFutureLiveEnrollments load failed:", enrollLoadError);
    return false;
  }

  type CourseJoin = { archived: boolean };
  const enrollments: EnrollmentCourseRow[] = (
    enrollmentRows ?? []
  ).map((row) => {
    const course = row.courses as CourseJoin | CourseJoin[] | null;
    const joined = Array.isArray(course) ? course[0] : course;
    return {
      courseId: row.course_id as string,
      archived: Boolean(joined?.archived),
    };
  });

  const liveIds = enrollments
    .filter((row) => !row.archived)
    .map((row) => row.courseId);
  if (liveIds.length === 0) return true;

  const { data: sessionRows, error: sessionError } = await admin
    .from("course_sessions")
    .select("course_id, session_start_time")
    .in("course_id", liveIds);

  if (sessionError) {
    console.error("dropFutureLiveEnrollments sessions failed:", sessionError);
    return false;
  }

  const toDrop = futureLiveCourseIdsToDrop(
    enrollments,
    (sessionRows ?? []).map((row) => ({
      courseId: row.course_id as string,
      sessionStartTime: row.session_start_time as string,
    }))
  );
  if (toDrop.length === 0) return true;

  const { error: deleteError } = await admin
    .from("course_enrollments")
    .delete()
    .eq("student_id", studentId)
    .in("course_id", toDrop);

  if (deleteError) {
    console.error("dropFutureLiveEnrollments delete failed:", deleteError);
    return false;
  }
  return true;
}

/**
 * Puts a cancelled/paused student back on courses they already attended.
 * Used after the old Quitar path wiped every enrollment.
 */
export async function restoreAlumniEnrollmentsFromAttendance(
  studentId: string
): Promise<{ restored: number } | { ok: false }> {
  const admin = createAdminClient();
  const displayName = await displayNameForStudent(studentId);

  const { data: rows, error } = await admin
    .from("session_attendance")
    .select("course_sessions ( course_id )")
    .eq("student_id", studentId)
    .eq("attended", true);

  if (error) {
    console.error("restoreAlumniEnrollmentsFromAttendance load failed:", error);
    return { ok: false };
  }

  const courseIds = new Set<string>();
  for (const row of rows ?? []) {
    const session = row.course_sessions as
      | { course_id: string }
      | { course_id: string }[]
      | null;
    const joined = Array.isArray(session) ? session[0] : session;
    if (joined?.course_id) courseIds.add(joined.course_id);
  }

  let restored = 0;
  for (const courseId of courseIds) {
    const { error: insertError } = await admin.from("course_enrollments").insert({
      course_id: courseId,
      student_id: studentId,
      display_name: displayName,
    });
    if (!insertError || insertError.code === "23505") {
      restored += 1;
    } else {
      console.error(
        "restoreAlumniEnrollmentsFromAttendance insert failed:",
        insertError
      );
      return { ok: false };
    }
  }

  return { restored };
}

/**
 * Drops a classroom student from live class lists without deleting months
 * they already sat in. PayPal / invited alumni keep those enrollments.
 * Students with a live Stripe sub stay on the roster: pause them in
 * ThriveCart instead, or the webhook will put them back.
 */
export async function removeClassroomStudent(
  studentId: string
): Promise<RemoveClassroomStudentResult> {
  const admin = createAdminClient();
  const { data: profile, error: loadError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .maybeSingle();

  if (loadError) {
    console.error("removeClassroomStudent load failed:", loadError);
    return { ok: false, reason: "error" };
  }
  if (!profile) return { ok: false, reason: "not-found" };
  if (profile.role === "teacher") return { ok: false, reason: "teacher" };

  const { data: livePeriods, error: periodError } = await admin
    .from("subscription_periods")
    .select("status")
    .eq("user_id", studentId);

  if (periodError) {
    console.error("removeClassroomStudent periods failed:", periodError);
    return { ok: false, reason: "error" };
  }
  if (
    isLiveStripeManaged((livePeriods ?? []).map((row) => row.status))
  ) {
    return { ok: false, reason: "stripe" };
  }

  const dropped = await dropFutureLiveEnrollments(studentId);
  if (!dropped) return { ok: false, reason: "error" };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ subscription_status: "cancelled" })
    .eq("id", studentId)
    .eq("role", "student-classroom");

  if (updateError) {
    console.error("removeClassroomStudent profile failed:", updateError);
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}
