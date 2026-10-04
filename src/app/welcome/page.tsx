import BrowsingShell from "@/components/shell/BrowsingShell";
import WelcomeCard from "@/components/WelcomeCard";
import { requireBrowsingStudent } from "@/lib/browsing-auth";
import WelcomeContinueButton from "./WelcomeContinueButton";

export const metadata = {
  title: "Bienvenido - Profe Kyle",
};

export default async function WelcomePage() {
  const { preview } = await requireBrowsingStudent("/welcome");

  return (
    <BrowsingShell activeTab="inicio" previewLevel={preview?.level ?? null}>
      <section className="pt-6">
        <WelcomeCard>
          <WelcomeContinueButton />
        </WelcomeCard>
      </section>
    </BrowsingShell>
  );
}