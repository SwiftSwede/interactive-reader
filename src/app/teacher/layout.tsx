import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth-server";
import TeacherLiveRefresh from "./TeacherLiveRefresh";
import TeacherShell from "@/components/teacher/TeacherShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacher("/teacher");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rawName = user?.user_metadata?.display_name;
  const teacherName =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : teacher.email;

  return (
    <TeacherShell teacherName={teacherName} teacherEmail={teacher.email}>
      <TeacherLiveRefresh />
      {children}
    </TeacherShell>
  );
}
