"use client";

export default function CharacterBand({
  characters,
  selected,
  onSelect,
  className = "",
}: {
  characters: string[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  className?: string;
}) {
  if (characters.length === 0) return null;

  return (
    <div
      data-character-band
      className={`character-band ${className}`.trim()}
      role="listbox"
      aria-label="Personajes"
      aria-orientation="horizontal"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="character-band-row">
        {characters.map((name) => {
          const on = selected === name;
          return (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={on}
              className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-label-md ${
                on
                  ? "border-accent bg-accent text-white"
                  : "border-paper-line bg-surface text-text-primary hover:border-accent"
              }`}
              onClick={() => onSelect(on ? null : name)}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
