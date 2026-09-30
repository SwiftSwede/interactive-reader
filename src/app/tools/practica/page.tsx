import Link from "next/link";
import BackLink from "@/components/BackLink";
import BrowsingShell from "@/components/shell/BrowsingShell";
import DrillSession from "@/components/drills/DrillSession";
import { browsingClassroomLevel, requireBrowsingStudent } from "@/lib/browsing-auth";
import { toDrillLevel } from "@/lib/drills";
import { loadStudentPractice, type StudentPractice } from "@/lib/student-drills";

export const metadata = {
  title: "Laboratorio de práctica - Profe Kyle",
};

type LabState =
  | { kind: "empty" }
  | { kind: "error" }
  | { kind: "ready"; practice: StudentPractice };

async function loadLab(
  supabase: Awaited<ReturnType<typeof requireBrowsingStudent>>["supabase"],
  userId: string,
  level: ReturnType<typeof browsingClassroomLevel>,
  preferReview: boolean
): Promise<LabState> {
  if (!level) return { kind: "empty" };
  try {
    const practice = await loadStudentPractice(supabase, {
      userId,
      level: toDrillLevel(level),
      preferReview,
    });
    if (practice.deck.length === 0) return { kind: "empty" };
    return { kind: "ready", practice };
  } catch (error) {
    console.error(
      "Drill Lab load failed:",
      error instanceof Error ? error.message : error
    );
    return { kind: "error" };
  }
}

export default async function PracticaPage({
  searchParams,
}: {
  searchParams: Promise<{ repaso?: string }>;
}) {
  const { supabase, user, profile, preview } =
    await requireBrowsingStudent("/tools/practica");
  const { repaso } = await searchParams;
  const preferReview = repaso === "1";
  const state: LabState = preview
    ? { kind: "empty" }
    : await loadLab(
        supabase,
        user.id,
        browsingClassroomLevel(profile, preview),
        preferReview
      );

  return (
    <BrowsingShell
      activeTab="herramientas"
      previewLevel={preview?.level ?? null}
    >
      <section className="pt-4">
        <div className="-ml-2 mb-2">
          <BackLink href="/tools" label="Herramientas" showLabel />
        </div>
        <h1 className="text-headline-lg text-text-primary">
          Laboratorio de práctica
        </h1>

        {state.kind === "ready" ? (
          <DrillSession
            missionName={
              state.practice.sessionKind === "intro"
                ? (state.practice.intro?.displayName ?? "práctica de repaso")
                : "práctica de repaso"
            }
            sessionKind={state.practice.sessionKind}
            deck={state.practice.deck}
            initialCollectionCount={state.practice.collectionCount}
          />
        ) : state.kind === "error" ? (
          <div className="mt-8">
            <p className="text-body-main text-text-secondary">
              Algo salió mal. Intenta de nuevo.
            </p>
            <Link
              href="/tools/practica"
              className="mt-4 inline-flex min-h-11 items-center rounded-card border border-paper-line px-5 text-label-md text-text-primary hover:bg-surface-hover"
            >
              Reintentar
            </Link>
          </div>
        ) : (
          <p className="mt-8 text-body-main text-text-secondary">
            Todavía no hay nada que practicar.
          </p>
        )}
      </section>
    </BrowsingShell>
  );
}
