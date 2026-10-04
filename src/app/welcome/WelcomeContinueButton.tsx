"use client";

import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { WELCOME_COPY } from "@/lib/lesson-copy";
import { markWelcomeSeen } from "@/lib/welcome-seen";

export default function WelcomeContinueButton() {
  const router = useRouter();

  return (
    <ActionButton
      className="w-full min-h-12"
      onClick={() => {
        markWelcomeSeen();
        router.replace("/dashboard");
      }}
    >
      {WELCOME_COPY.button}
    </ActionButton>
  );
}