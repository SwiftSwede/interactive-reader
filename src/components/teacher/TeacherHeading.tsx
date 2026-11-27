"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TeacherBackLink from "@/app/teacher/TeacherBackLink";
import { parentTeacherPath } from "@/lib/teacher-nav";

function PageTitle({
  title,
  heading,
}: {
  title?: string;
  heading?: ReactNode;
}) {
  return (
    heading ?? (
      <h1 className="min-w-0 text-balance break-words text-headline-lg text-text-primary">
        {title}
      </h1>
    )
  );
}

export function TeacherTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const href = parentTeacherPath(usePathname());

  return (
    <div className={className}>
      {href ? <TeacherBackLink /> : null}
      <h1
        className={`min-w-0 text-balance break-words text-headline-lg text-text-primary ${
          href ? "mt-3" : ""
        }`}
      >
        {children}
      </h1>
    </div>
  );
}

export function TeacherHeading({
  title,
  heading,
  description,
  action,
}: {
  title?: string;
  heading?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const href = parentTeacherPath(usePathname());

  if (!href) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <PageTitle title={title} heading={heading} />
          {description ? (
            <p className="mt-2 break-words text-body-main text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <TeacherBackLink />
          {description ? (
            <p className="min-w-0 truncate text-label-sm text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3 min-w-0">
        <PageTitle title={title} heading={heading} />
      </div>
    </div>
  );
}
