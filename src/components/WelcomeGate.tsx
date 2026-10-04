"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import ActionButton from "./ActionButton";
import WelcomeCard from "./WelcomeCard";
import { WELCOME_COPY } from "@/lib/lesson-copy";
import { markWelcomeSeen, readWelcomeSeen } from "@/lib/welcome-seen";

export default function WelcomeGate({
  children,
  skip = false,
}: {
  children: ReactNode;
  skip?: boolean;
}) {
  const [ready, setReady] = useState(skip);
  const [showWelcome, setShowWelcome] = useState(false);

  useLayoutEffect(() => {
    if (skip) {
      setShowWelcome(false);
      setReady(true);
      return;
    }
    setShowWelcome(!readWelcomeSeen());
    setReady(true);
  }, [skip]);

  if (!ready) return null;
  if (!showWelcome) return children;

  return (
    <WelcomeCard>
      <ActionButton
        className="w-full min-h-12"
        onClick={() => {
          markWelcomeSeen();
          setShowWelcome(false);
        }}
      >
        {WELCOME_COPY.button}
      </ActionButton>
    </WelcomeCard>
  );
}