"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 10_000;

export default function TeacherLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
