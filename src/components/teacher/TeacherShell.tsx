"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/app/dashboard/actions";
import TeacherBackLink from "@/app/teacher/TeacherBackLink";
import TeacherNav from "./TeacherNav";
import ContextPanel from "./ContextPanel";
import { TeacherPanelProvider } from "./TeacherPanelContext";

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/teacher"
      onClick={onClick}
      className="text-headline-md text-text-primary"
    >
      Profe Kyle
    </Link>
  );
}

function RailFooter({
  teacherName,
  teacherEmail,
}: {
  teacherName: string;
  teacherEmail: string;
}) {
  return (
    <div className="mt-auto border-t border-paper-line px-2 py-4">
      <p className="truncate px-3 text-label-sm text-text-secondary min-[600px]:max-lg:sr-only">
        {teacherName}
      </p>
      <p className="mt-0.5 truncate px-3 text-label-sm text-text-muted min-[600px]:max-lg:sr-only">
        {teacherEmail}
      </p>
      <form action={signOut} className="mt-2">
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center rounded-card px-3 text-label-sm text-text-accent hover:bg-accent-soft hover:text-text-accent-dark active:bg-surface-hover min-[600px]:max-lg:justify-center min-[600px]:max-lg:px-0"
          aria-label="Cerrar sesión"
        >
          <LogOut
            className="hidden h-5 w-5 min-[600px]:max-lg:inline"
            aria-hidden="true"
          />
          <span className="min-[600px]:max-lg:sr-only">Cerrar sesión</span>
        </button>
      </form>
    </div>
  );
}

export default function TeacherShell({
  children,
  teacherName,
  teacherEmail,
}: {
  children: React.ReactNode;
  teacherName: string;
  teacherEmail: string;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <TeacherPanelProvider>
      <div className="flex h-dvh flex-col bg-paper min-[600px]:flex-row">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-line bg-surface px-4 min-[600px]:hidden">
          <Wordmark />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft hover:text-text-accent"
            aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </header>

        {navOpen ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-surface min-[600px]:hidden">
            <div className="flex h-14 items-center justify-between border-b border-paper-line px-4">
              <Wordmark onClick={() => setNavOpen(false)} />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-card text-text-secondary hover:bg-accent-soft"
                aria-label="Cerrar menú"
                onClick={() => setNavOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto pt-4" aria-label="Profesor">
              <TeacherNav onNavigate={() => setNavOpen(false)} />
            </nav>
            <RailFooter
              teacherName={teacherName}
              teacherEmail={teacherEmail}
            />
          </div>
        ) : null}

        <aside className="hidden h-full w-16 shrink-0 flex-col border-r border-paper-line bg-surface lg:w-60 min-[600px]:flex">
          <div className="flex h-14 items-center px-4 min-[600px]:max-lg:justify-center min-[600px]:max-lg:px-2">
            <span className="min-[600px]:max-lg:sr-only">
              <Wordmark />
            </span>
            <span className="hidden min-[600px]:max-lg:inline">
              <Link
                href="/teacher"
                aria-label="Profe Kyle"
                className="font-sans text-nav-ui font-semibold text-text-primary"
              >
                PK
              </Link>
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto pt-2" aria-label="Profesor">
            <TeacherNav />
          </nav>
          <RailFooter
            teacherName={teacherName}
            teacherEmail={teacherEmail}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[960px] px-6 py-8">
              <TeacherBackLink />
              {children}
            </div>
          </main>
          <ContextPanel />
        </div>
      </div>
    </TeacherPanelProvider>
  );
}
