import Link from "next/link";
import { BookOpen, Home, LayoutGrid, User } from "lucide-react";
import AskTeacherButton from "@/components/ask/AskTeacherButton";
import StudentPreviewBanner from "@/components/shell/StudentPreviewBanner";
import type { QuestionSurface } from "@/lib/question-requests";
import type { CourseLevel } from "@/types";

export type BrowsingTab = "inicio" | "lecciones" | "herramientas";

const TABS: {
  id: BrowsingTab;
  href: string;
  label: string;
  icon: typeof Home;
}[] = [
  { id: "inicio", href: "/dashboard", label: "Inicio", icon: Home },
  { id: "lecciones", href: "/lessons", label: "Lecciones", icon: BookOpen },
  {
    id: "herramientas",
    href: "/tools",
    label: "Herramientas",
    icon: LayoutGrid,
  },
];

export default function BrowsingShell({
  children,
  activeTab,
  previewLevel = null,
  accountHref = "/profile",
  accountLabel = "Perfil",
  askSurface = null,
}: {
  children: React.ReactNode;
  activeTab: BrowsingTab | null;
  previewLevel?: CourseLevel | null;
  accountHref?: string;
  accountLabel?: string;
  askSurface?: QuestionSurface | null;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20">
        {previewLevel ? <StudentPreviewBanner level={previewLevel} /> : null}
        <header className="h-14 border-b border-paper-line bg-paper-header backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-2xl items-center justify-between px-4">
            <p className="text-label-sm text-text-secondary">Profe Kyle</p>
            <div className="flex items-center">
              {askSurface && !previewLevel ? (
                <AskTeacherButton layout="header" surface={askSurface} />
              ) : null}
              {accountLabel === "Perfil" ? (
                <Link
                  href={accountHref}
                  aria-label="Perfil"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-muted hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href={accountHref}
                  className="inline-flex h-11 items-center rounded-card px-3 text-label-md text-text-secondary hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover"
                >
                  {accountLabel}
                </Link>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-[calc(88px+env(safe-area-inset-bottom))]">
        {children}
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-line bg-paper-header backdrop-blur-sm lg:inset-x-auto lg:left-1/2 lg:w-full lg:max-w-[480px] lg:-translate-x-1/2 lg:rounded-[24px] lg:border lg:bottom-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex h-14 max-w-2xl items-stretch">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <li key={tab.id} className="flex-1">
                <Link
                  href={tab.href}
                  className={`relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-label-md ${
                    active ? "text-accent" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {active ? (
                    <span
                      className="absolute top-1 h-1 w-1 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
