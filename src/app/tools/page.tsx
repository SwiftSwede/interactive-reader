import { LayoutGrid } from "lucide-react";
import BrowsingShell from "@/components/shell/BrowsingShell";
import { requireBrowsingStudent } from "@/lib/browsing-auth";

export const metadata = {
  title: "Herramientas - Profe Kyle",
};

export default async function ToolsPage() {
  await requireBrowsingStudent("/tools");

  return (
    <BrowsingShell activeTab="herramientas">
      <section className="pt-6">
        <h1 className="text-headline-lg text-text-primary">Herramientas</h1>
        <div className="mt-16 flex flex-col items-center px-4 text-center">
          <LayoutGrid className="h-12 w-12 text-text-muted" aria-hidden="true" />
          <p className="mt-4 text-body-main text-text-secondary">
            Próximamente: la biblioteca de sonidos del Profe Kyle.
          </p>
        </div>
      </section>
    </BrowsingShell>
  );
}
