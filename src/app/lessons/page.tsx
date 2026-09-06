import { BookOpen } from "lucide-react";
import BrowsingShell from "@/components/shell/BrowsingShell";
import LessonsList from "@/components/dashboard/LessonsList";
import { requireBrowsingStudent } from "@/lib/browsing-auth";
import { loadDashboard } from "@/lib/dashboard";

export const metadata = {
  title: "Lecciones - Profe Kyle",
};

export default async function LessonsPage() {
  const { supabase, user, profile, displayName } =
    await requireBrowsingStudent("/lessons");
  const data = await loadDashboard(
    supabase,
    user.id,
    profile?.classroomLevel ?? null,
    displayName
  );

  const groups = [
    ...(data.courseDisplayName
      ? [{ displayName: data.courseDisplayName, lessons: data.lessons }]
      : []),
    ...data.olderCourses,
  ].filter((group) => group.lessons.length > 0);

  const showHeadings = groups.length > 1;
  const empty = groups.length === 0;

  return (
    <BrowsingShell activeTab="lecciones">
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">Lecciones</h1>
        {empty ? (
          <div className="mt-16 flex flex-col items-center px-4 text-center">
            <BookOpen
              className="h-12 w-12 text-text-muted"
              aria-hidden="true"
            />
            <p className="mt-4 text-body-main text-text-secondary">
              Aún no tienes clases asignadas. Tu profe te enviará un enlace.
            </p>
          </div>
        ) : (
          <LessonsList groups={groups} showHeadings={showHeadings} />
        )}
      </section>
    </BrowsingShell>
  );
}
