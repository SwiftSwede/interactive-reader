import Link from "next/link";
import { ChevronRight } from "lucide-react";
import BrowsingShell from "@/components/shell/BrowsingShell";
import { browsingClassroomLevel, requireBrowsingStudent } from "@/lib/browsing-auth";
import { toDrillLevel } from "@/lib/drills";
import { loadStudentPractice } from "@/lib/student-drills";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Herramientas - Profe Kyle",
};

async function loadLabEntry(
  supabase: Awaited<ReturnType<typeof requireBrowsingStudent>>["supabase"],
  userId: string,
  level: ReturnType<typeof browsingClassroomLevel>
) {
  if (!level) {
    return { line: "Todavía no hay nada que practicar.", collectionCount: 0 };
  }
  try {
    const practice = await loadStudentPractice(supabase, {
      userId,
      level: toDrillLevel(level),
    });
    const line = practice.intro
      ? practice.intro.displayName
      : practice.reviewCount > 0
        ? "Hay ejercicios de repaso."
        : "Todavía no hay nada que practicar.";
    return { line, collectionCount: practice.collectionCount };
  } catch (error) {
    console.error(
      "Herramientas practice failed:",
      error instanceof Error ? error.message : error
    );
    return { line: "Todavía no hay nada que practicar.", collectionCount: 0 };
  }
}

function SoundsCard() {
  return (
    <Link
      href="/sounds"
      className="mt-4 flex items-center justify-between gap-3 rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover active:bg-accent-soft"
    >
      <span>
        <span className="block text-headline-md text-text-primary">
          Guía de sonidos
        </span>
        <span className="mt-1 block text-label-md text-text-secondary">
          Los sonidos del inglés americano.
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-text-muted"
        aria-hidden="true"
      />
    </Link>
  );
}

export default async function ToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <BrowsingShell
        activeTab="herramientas"
        accountHref="/login"
        accountLabel="Entra"
      >
        <section className="pt-6">
          <h1 className="text-headline-lg text-text-primary">Herramientas</h1>
          <Link
            href="/login?next=/tools/practica"
            className="mt-6 flex items-center justify-between gap-3 rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover active:bg-accent-soft"
          >
            <span>
              <span className="block text-headline-md text-text-primary">
                Laboratorio de práctica
              </span>
              <span className="mt-1 block text-label-md text-text-secondary">
                Entra para ver tu colección.
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </Link>
          <SoundsCard />
        </section>
      </BrowsingShell>
    );
  }

  const { supabase: authed, user: student, profile, preview } =
    await requireBrowsingStudent("/tools");
  const lab = preview
    ? { line: "Todavía no hay nada que practicar.", collectionCount: 0 }
    : await loadLabEntry(
        authed,
        student.id,
        browsingClassroomLevel(profile, preview)
      );

  return (
    <BrowsingShell
      activeTab="herramientas"
      previewLevel={preview?.level ?? null}
    >
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">Herramientas</h1>

        <Link
          href="/tools/practica"
          className="mt-6 flex items-center justify-between gap-3 rounded-sheet border border-paper-line bg-surface p-4 hover:bg-surface-hover active:bg-accent-soft"
        >
          <span>
            <span className="block text-headline-md text-text-primary">
              Laboratorio de práctica
            </span>
            <span className="mt-1 block text-label-md text-text-secondary">
              {lab.line}
            </span>
            <span className="mt-1 block text-label-md text-text-secondary">
              Tu colección: {lab.collectionCount}
            </span>
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        </Link>

        <SoundsCard />
      </section>
    </BrowsingShell>
  );
}
