export const MAIN_COHORT = "main";
export const EXTRA_COHORT = "extra";

export type ClassroomCohort = typeof MAIN_COHORT | typeof EXTRA_COHORT;

export function otherClassroomCohort(cohort: ClassroomCohort): ClassroomCohort {
  return cohort === EXTRA_COHORT ? MAIN_COHORT : EXTRA_COHORT;
}

export function normalizeClassroomCohort(
  value: string | null | undefined
): ClassroomCohort {
  return value === EXTRA_COHORT ? EXTRA_COHORT : MAIN_COHORT;
}

/** A class link enrolls only inside the student's horario. */
export function cohortAllowsSessionEnroll(
  studentCohort: string | null | undefined,
  courseCohort: string | null | undefined
): boolean {
  return (
    normalizeClassroomCohort(studentCohort) ===
    normalizeClassroomCohort(courseCohort)
  );
}
