/** Stop the browser from offering answers typed in earlier exams. */
export function examNoFill(name: string) {
  return {
    name,
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "none",
    spellCheck: false,
    "data-1p-ignore": "true",
    "data-lpignore": "true",
    "data-bwignore": "true",
    "data-form-type": "other",
  } as const;
}
