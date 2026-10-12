"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 10_000;

function shouldSkipRefresh(): boolean {
  if (document.visibilityState !== "visible") return true;
  if (document.querySelector("dialog[open]")) return true;
  return false;
}

export default function TeacherLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (shouldSkipRefresh()) return;
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
