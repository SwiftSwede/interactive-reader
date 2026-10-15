import LocalDateTime from "@/components/LocalDateTime";
import {
  QUESTION_SURFACE_LABELS,
  type QuestionRequest,
} from "@/lib/question-requests";

export default function StudentQuestionsBlock({
  requests,
}: {
  requests: QuestionRequest[];
}) {
  return (
    <div className="mt-6">
      <h2 className="text-headline-md text-text-primary">Preguntas</h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Todavía no hay preguntas.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {requests.map((row) => {
            const open = row.addressedAt == null;
            return (
              <li
                key={row.id}
                className={`rounded-card border px-3 py-3 ${
                  open
                    ? "border-accent-soft bg-accent-softer"
                    : "border-paper-line bg-surface"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm text-text-primary">
                  {row.body}
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  {QUESTION_SURFACE_LABELS[row.surface]}
                  {row.storyTitle ? ` · ${row.storyTitle}` : ""}
                </p>
                <LocalDateTime iso={row.createdAt} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
