import Link from "next/link";
import { BookOpen, Home, LayoutGrid, User } from "lucide-react";

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
}: {
  children: React.ReactNode;
  activeTab: BrowsingTab | null;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 h-14 border-b border-paper-line bg-paper-header backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-2xl items-center justify-between px-4">
          <p className="text-label-sm text-text-secondary">Profe Kyle</p>
          <Link
            href="/profile"
            aria-label="Perfil"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-muted hover:bg-accent-soft hover:text-text-accent active:bg-surface-hover"
          >
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div
        className="mx-auto max-w-2xl px-4"
        style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
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
