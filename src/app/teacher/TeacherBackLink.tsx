"use client";

import { usePathname } from "next/navigation";
import BackLink from "@/components/BackLink";

export function parentTeacherPath(pathname: string): string | null {
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts[0] !== "teacher" || parts.length < 3) return null;

  if (parts.length >= 7 && parts[5] === "submissions") {
    return `/${parts.slice(0, 5).join("/")}`;
  }
  if (parts.length >= 5 && (parts[3] === "sessions" || parts[3] === "students")) {
    return `/${parts.slice(0, 3).join("/")}`;
  }
  if (parts[1] === "classes") {
    return "/teacher";
  }
  return "/teacher";
}

export default function TeacherBackLink() {
  const pathname = usePathname();
  const href = parentTeacherPath(pathname);
  if (!href) return null;
  return <BackLink href={href} />;
}
