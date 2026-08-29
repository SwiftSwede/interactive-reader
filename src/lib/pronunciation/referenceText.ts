/** Strip acute/stress marks so the sentence is plain English. */
export function stripStressMarks(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Azure looks words up in its lexicon. Stress marks make that lookup fail. */
export function azureReferenceText(text: string): string {
  return stripStressMarks(text);
}
