import { formatCountdownLabel } from "@/lib/dashboard";

// Lora's tabular figures widen the space glyph, so only the numbers get tnum.
export default function CountdownText({ ms }: { ms: number }) {
  const parts = formatCountdownLabel(ms).split(" ");
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? " " : null}
          <span className="tabular-nums">{part}</span>
        </span>
      ))}
    </>
  );
}
