import { BarChart3 } from "lucide-react";
import { requireTeacher } from "@/lib/auth-server";

export const metadata = {
  title: "Analíticas - Profe Kyle",
};

export default async function TeacherAnalyticsPage() {
  await requireTeacher("/teacher");

  return (
    <section>
      <h1 className="text-headline-lg text-text-primary">Analíticas</h1>
      <div className="mt-16 flex flex-col items-center px-4 text-center">
        <BarChart3 className="h-12 w-12 text-text-muted" aria-hidden="true" />
        <p className="mt-4 text-body-main text-text-secondary">
          Próximamente: las palabras más consultadas por mes y nivel.
        </p>
      </div>
    </section>
  );
}
