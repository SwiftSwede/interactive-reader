"use client";

import { useState } from "react";

type CourseView = "clases" | "estudiantes";

export default function CourseWorkspace({
  classes,
  students,
}: {
  classes: React.ReactNode;
  students: React.ReactNode;
}) {
  const [view, setView] = useState<CourseView>("clases");

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Vista del grupo"
        className="flex flex-wrap gap-2"
      >
        <ViewChip
          label="Clases"
          active={view === "clases"}
          onClick={() => setView("clases")}
        />
        <ViewChip
          label="Estudiantes"
          active={view === "estudiantes"}
          onClick={() => setView("estudiantes")}
        />
      </div>
      <div
        role="tabpanel"
        className="mt-6"
        aria-label={view === "clases" ? "Clases" : "Estudiantes"}
      >
        {view === "clases" ? classes : students}
      </div>
    </div>
  );
}

function ViewChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded-card px-4 text-label-md font-medium ${
        active
          ? "bg-accent text-white"
          : "border border-paper-line text-text-secondary hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
