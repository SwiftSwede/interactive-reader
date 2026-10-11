import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth-server";
import { courseLevelLabel } from "@/lib/teacher/groups-students";
import {
  getSelfPacedCourse,
  searchStoriesForCourse,
} from "@/lib/self-paced-admin";
import {
  addCourseLessonAction,
  moveCourseLessonAction,
  removeCourseLessonAction,
  setSelfPacedPublishedAction,
} from "../actions";

export const metadata = {
  title: "Curso autoguiado - Profe Kyle",
};

export default async function SelfPacedCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const teacher = await requireTeacher("/teacher/content/courses");
  const { id } = await params;
  const { q } = await searchParams;
  const course = await getSelfPacedCourse(teacher.id, id);
  if (!course) notFound();
  const hits = q
    ? await searchStoriesForCourse({
        teacherId: teacher.id,
        courseId: course.id,
        query: q,
      })
    : [];

  return (
    <section>
      <Link
        href="/teacher/content/courses"
        className="text-label-md text-text-accent"
      >
        Cursos autoguiados
      </Link>
      <h1 className="mt-3 text-headline-lg text-text-primary">{course.name}</h1>
      <p className="mt-2 text-body-main text-text-secondary">
        {courseLevelLabel(course.level)}
        {course.description ? `. ${course.description}` : ""}
      </p>

      <form action={setSelfPacedPublishedAction} className="mt-6">
        <input type="hidden" name="courseId" value={course.id} />
        <label className="flex min-h-11 items-center gap-3 text-label-md text-text-primary">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={course.isPublished}
            className="h-4 w-4"
          />
          Publicado
        </label>
        <button
          type="submit"
          className="mt-3 inline-flex min-h-11 items-center rounded-card border border-paper-line bg-surface px-4 text-label-md text-text-primary hover:bg-surface-hover"
        >
          Guardar
        </button>
      </form>

      <h2 className="mt-8 text-headline-md text-text-primary">Lecciones</h2>
      {course.lessons.length === 0 ? (
        <p className="mt-3 text-body-main text-text-secondary">
          Todavía no hay lecciones. Busca una por el título.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {course.lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="rounded-card border border-paper-line bg-surface px-3 py-3"
            >
              <p className="text-label-md text-text-primary">
                {lesson.position}. {lesson.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={moveCourseLessonAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="inline-flex min-h-11 items-center rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft disabled:opacity-40"
                  >
                    Subir
                  </button>
                </form>
                <form action={moveCourseLessonAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === course.lessons.length - 1}
                    className="inline-flex min-h-11 items-center rounded-card px-3 text-label-md text-text-accent hover:bg-accent-soft disabled:opacity-40"
                  >
                    Bajar
                  </button>
                </form>
                <form action={removeCourseLessonAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center rounded-card px-3 text-label-md text-text-secondary hover:bg-surface-hover"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form method="get" className="mt-8 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1.5 block text-label-md text-text-secondary">
            Buscar por título
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            className="w-full rounded-card border border-paper-line bg-white px-3 py-3 text-body-main text-text-primary focus:border-2 focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 w-fit items-center rounded-card border border-paper-line bg-surface px-4 text-label-md text-text-primary hover:bg-surface-hover"
        >
          Buscar
        </button>
      </form>

      {hits.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {hits.map((hit) => (
            <li
              key={hit.id}
              className="flex items-center justify-between gap-3 rounded-card border border-paper-line bg-surface px-3 py-3"
            >
              <p className="text-label-md text-text-primary">{hit.title}</p>
              <form action={addCourseLessonAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="storyId" value={hit.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-label-md text-white hover:bg-accent-hover"
                >
                  Agregar
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : q ? (
        <p className="mt-4 text-body-main text-text-secondary">
          Nada con ese título en este nivel.
        </p>
      ) : null}
    </section>
  );
}
