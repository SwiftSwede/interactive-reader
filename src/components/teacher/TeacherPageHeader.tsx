import type { ReactNode } from "react";
import { TeacherHeading } from "./TeacherHeading";

export default function TeacherPageHeader({
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
  return (
    <header>
      <TeacherHeading
        title={title}
        heading={heading}
        description={description}
        action={action}
      />
    </header>
  );
}
