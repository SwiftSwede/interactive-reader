import Link from "next/link";
import BackLink from "@/components/BackLink";
import BrowsingShell from "@/components/shell/BrowsingShell";
import DrillSession from "@/components/drills/DrillSession";
import { browsingClassroomLevel, requireBrowsingStudent } from "@/lib/browsing-auth";
import { loadDrillLab, type DrillLab } from "@/lib/drill-session";
import { toDrillLevel } from "@/lib/drills";
import { missionForStudent } from "@/lib/student-mission";

export const metadata = {
  title: "Laboratorio de práctica - Profe Kyle",
};

type LabState =
  | { kind: "empty" }
  | { kind: "error" }
  | { kind: "ready"; missionName: string; lab: DrillLab };

async function loadLab(
  supabase: Awaited<ReturnType<typeof requireBrowsingStudent>>["supabase"],
  userId: string,
  level: ReturnType<typeof browsingClassroomLevel>
): Promise<LabState> {
  if (!level) return { kind: "empty" };
  try {
    const mission = await missionForStudent(supabase, userId);
    if (!mission) return { kind: "empty" };
    const lab = await loadDrillLab(supabase, {
      userId,
      missionTagId: mission.tagId,
      level: toDrillLevel(level),
    });
    return { kind: "ready", missionName: mission.displayName, lab };
  } catch (error) {
    console.error(
      "Drill Lab load failed:",
      error instanceof Error ? error.message : error
    );
    return { kind: "error" };
  }
}

export default async function PracticaPage() {
  const { supabase, user, profile, preview } =
    await requireBrowsingStudent("/tools/practica");
  const state: LabState = preview
    ? { kind: "empty" }
    : await loadLab(supabase, user.id, browsingClassroomLevel(profile, preview));

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
            missionName={state.missionName}
            deck={state.lab.deck}
            initialCollectionCount={state.lab.collectionCount}
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
