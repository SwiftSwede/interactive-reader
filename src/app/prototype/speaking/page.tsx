import { notFound, redirect } from "next/navigation";
import SpeakingSession from "@/components/SpeakingSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSpeakingAccess } from "@/lib/speakingAccess";
import { remainingAttempts } from "@/lib/speakingFeedback";
import {
  countCompletedToday,
  listSpeakingAttempts,
} from "@/lib/speakingAttempts";

export const metadata = {
  title: "Habla - Profe Kyle",
};

export default async function SpeakingPrototypePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/prototype/speaking");
  }

  const { allowed, owner } = await getSpeakingAccess(user.id, user.email);
  if (!allowed) {
    notFound();
  }
  const admin = createAdminClient();
  const [attempts, completed] = await Promise.all([
    listSpeakingAttempts(admin, { userId: user.id, owner }),
    countCompletedToday(admin, user.id),
  ]);

  return (
    <main className="min-h-dvh bg-paper">
      <SpeakingSession
        owner={owner}
        backHref={owner ? "/teacher" : "/dashboard"}
        initialAttempts={attempts}
        initialRemaining={remainingAttempts(completed, owner)}
      />
    </main>
  );
}
