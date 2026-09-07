"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Home,
  Search,
  Users,
} from "lucide-react";
import { isTeacherNavActive } from "@/lib/teacher-nav";

type NavItem = {
  href: string | null;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/teacher", label: "Este mes", icon: Home, exact: true },
  { href: "/teacher/groups", label: "Grupos", icon: Users },
  { href: "/teacher/students", label: "Estudiantes", icon: Search },
  { href: "/teacher/analytics", label: "Analíticas", icon: BarChart3 },
  { href: null, label: "Contenido", icon: BookOpen },
];

export default function TeacherNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1 pr-2">
      {NAV.map((item) => {
        const Icon = item.icon;
        const disabled = item.href == null;
        const active =
          !disabled && item.href
            ? isTeacherNavActive(pathname, item.href)
            : false;
        const className = `flex min-h-11 items-center gap-3 rounded-l-none rounded-r-card border-l-[3px] px-3 text-label-md transition-colors ${
          disabled
            ? "cursor-not-allowed border-l-transparent text-text-muted"
            : active
              ? "border-l-accent bg-surface-hover text-text-primary"
              : "border-l-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        }`;

        const inner = (
          <>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-[600px]:max-lg:sr-only">{item.label}</span>
          </>
        );

        if (disabled) {
          return (
            <li key={item.label}>
              <span
                className={className}
                title="Próximamente"
                aria-disabled="true"
                aria-label="Contenido. Próximamente"
              >
                {inner}
              </span>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <Link
              href={item.href!}
              className={className}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              {inner}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
