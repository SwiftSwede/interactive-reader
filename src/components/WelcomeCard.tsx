import type { ReactNode } from "react";
import { WELCOME_COPY } from "@/lib/lesson-copy";

export default function WelcomeCard({ children }: { children: ReactNode }) {
  const copy = WELCOME_COPY;

  return (
    <article
      lang="es"
      className="rounded-card border border-paper-line bg-surface p-4"
    >
      <h1 className="text-headline-md text-text-primary">{copy.title}</h1>
      <p className="mt-3 text-body-main text-text-secondary">{copy.body}</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-body-main text-text-secondary">
        {copy.bullets.map((bullet) => (
          <li key={bullet.lead}>
            <strong className="font-semibold text-text-primary">
              {bullet.lead}
            </strong>{" "}
            {bullet.text}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-body-main text-text-secondary">{copy.closing}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}