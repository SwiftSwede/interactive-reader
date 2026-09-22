"use client";

import { exitStudentPreview } from "@/app/teacher/preview/actions";
import { studentPreviewLevelLabel } from "@/lib/student-preview";
import type { CourseLevel } from "@/types";

export default function StudentPreviewBanner({
  level,
}: {
  level: CourseLevel;
}) {
  return (
    <div className="bg-success text-white">
      <div className="mx-auto flex min-h-11 max-w-2xl items-center gap-3 px-4 py-2">
        <p className="min-w-0 flex-1 text-label-sm">
          Vista de estudiante · solo lectura · {studentPreviewLevelLabel(level)}
        </p>
        <form action={exitStudentPreview}>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center text-label-md font-semibold text-white underline decoration-white/60 underline-offset-2 hover:decoration-white"
          >
            Volver al panel
          </button>
        </form>
      </div>
    </div>
  );
}
