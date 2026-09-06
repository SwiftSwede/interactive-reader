import { LogOut } from "lucide-react";
import BackLink from "@/components/BackLink";
import EditDisplayNameForm from "@/components/dashboard/EditDisplayNameForm";
import BrowsingShell from "@/components/shell/BrowsingShell";
import { signOut } from "@/app/dashboard/actions";
import { requireBrowsingStudent } from "@/lib/browsing-auth";
import { loadDashboard } from "@/lib/dashboard";

export const metadata = {
  title: "Perfil - Profe Kyle",
};

export default async function ProfilePage() {
  const { supabase, user, profile, displayName } =
    await requireBrowsingStudent("/profile");
  const data = await loadDashboard(
    supabase,
    user.id,
    profile?.classroomLevel ?? null,
    displayName
  );

  const name = data.displayName ?? "Sin nombre";
  const active = profile?.subscriptionStatus === "active";

  return (
    <BrowsingShell activeTab={null}>
      <section className="pt-4">
        <div className="-ml-2 mb-2">
          <BackLink href="/dashboard" showLabel />
        </div>
        <h1 className="text-headline-lg text-text-primary">Perfil</h1>

        <article className="mt-6 rounded-sheet border border-paper-line bg-surface p-4">
          <p className="font-heading text-lg font-semibold text-text-primary">
            {name}
          </p>
          <p className="mt-1 text-label-md text-text-secondary">{user.email}</p>
          <p className="mt-3 flex items-center gap-2 text-label-md">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                active ? "bg-success" : "bg-error"
              }`}
              aria-hidden="true"
            />
            <span className={active ? "text-success" : "text-error"}>
              {active ? "Activa" : "Expirada"}
            </span>
          </p>
          <EditDisplayNameForm currentName={name} />
        </article>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-card border border-paper-line text-label-md text-text-primary hover:bg-surface-hover"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </section>
    </BrowsingShell>
  );
}
