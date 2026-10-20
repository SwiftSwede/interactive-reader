import { splitWritingQuestions } from "@/lib/writing";

export default function WritingQuestions({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const questions = splitWritingQuestions(text);
  if (questions.length < 2) {
    return (
      <p className={`whitespace-pre-wrap ${className ?? ""}`}>{text}</p>
    );
  }
  return (
    <ol className={`list-decimal space-y-3 pl-5 ${className ?? ""}`}>
      {questions.map((question, index) => (
        <li key={index} className="whitespace-pre-wrap">
          {question}
        </li>
      ))}
    </ol>
  );
}
