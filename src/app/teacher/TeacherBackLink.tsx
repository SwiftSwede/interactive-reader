"use client";

import { usePathname } from "next/navigation";
import BackLink from "@/components/BackLink";
import { parentTeacherPath } from "@/lib/teacher-nav";

export { parentTeacherPath };

export default function TeacherBackLink() {
  const pathname = usePathname();
  const href = parentTeacherPath(pathname);
  if (!href) return null;
  return <BackLink href={href} />;
}
