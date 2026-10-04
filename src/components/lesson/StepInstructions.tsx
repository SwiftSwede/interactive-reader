import type { LessonCopyEntry } from "@/lib/lesson-copy";

function InlineMarks({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

export default function StepInstructions({ copy }: { copy: LessonCopyEntry }) {
  return (
    <header className="mb-4" lang="es">
      <h2 className="text-headline-md text-text-primary mb-2">{copy.title}</h2>
      <ul className="list-disc space-y-2 pl-5 text-body-main text-text-secondary">
        {copy.instructions.map((line) => (
          <li key={line}>
            <InlineMarks text={line} />
          </li>
        ))}
        {copy.note ? (
          <li>
            <strong className="font-semibold text-text-primary">
              {copy.note.lead}
            </strong>{" "}
            <InlineMarks text={copy.note.body} />
          </li>
        ) : null}
      </ul>
    </header>
  );
}
