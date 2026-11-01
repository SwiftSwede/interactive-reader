import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import CourseOutline from "@/components/dashboard/CourseOutline";
import BrowsingShell from "@/components/shell/BrowsingShell";
import StoryAccessMessage from "@/components/StoryAccessMessage";
import { promoteTeacherIfNeeded, getProfile } from "@/lib/auth-server";
import { loadSelfPacedCoursePage } from "@/lib/library-access";
import { documentTitle } from "@/lib/page-title";
import { readTeacherStudentPreview } from "@/lib/student-preview-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const missing = (
  <StoryAccessMessage
    title="No encontré esa lección"
    body="Revisa el link o pídeselo otra vez al Profe Kyle."
  />
);

const denied = (
  <StoryAccessMessage
    title="Esta lección es de un curso"
    body="Esta lección es de un curso que todavía no tienes."
  />
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  if (!z.string().uuid().safeParse(courseId).success) {
    return { title: documentTitle("Curso") };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("courses")
    .select("name")
    .eq("id", courseId)
    .maybeSingle();
  return { title: documentTitle((data?.name as string | undefined) ?? "Curso") };
}

export default async function SelfPacedCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!z.string().uuid().safeParse(courseId).success) return missing;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/course/${courseId}`)}`);
  }

  await promoteTeacherIfNeeded(user.id, user.email);
  const profile = await getProfile(user.id);
  const previewLevel = await readTeacherStudentPreview(profile?.role);
  const access =
    profile?.role === "teacher" && previewLevel
      ? "preview"
      : profile?.role === "teacher"
        ? "teacher"
        : "student";

  const page = await loadSelfPacedCoursePage({
    userId: user.id,
    courseId,
    access,
    previewLevel,
  });
  if (page.kind === "missing") return missing;
  if (page.kind === "denied") return denied;

  const isTeacher = access === "teacher";

  return (
    <BrowsingShell
      activeTab={null}
      previewLevel={previewLevel}
      accountHref={isTeacher ? "/teacher" : "/profile"}
      accountLabel={isTeacher ? "Inicio" : "Perfil"}
    >
      <CourseOutline
        name={page.name}
        meter={page.meter}
        finished={page.finished}
        pendingLine={page.pendingLine}
        rows={page.rows}
      />
    </BrowsingShell>
  );
}
