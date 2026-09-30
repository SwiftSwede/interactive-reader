import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHookStructure } from "@/lib/parse-drill-content";
import type { DrillItem, DrillItemState } from "@/lib/drills";

// What the Lab client receives. Answers, notes, and source links stay on the
// server; the attempt route checks the answer.

export type SessionItem =
  | {
      id: string;
      format: "teach";
      repaso: boolean;
      lead: string;
      examples: string[];
      closing: string | null;
    }
  | {
      id: string;
      format: "cloze";
      repaso: boolean;
      text: string;
      options: string[] | null;
    }
  | {
      id: string;
      format: "translation";
      repaso: boolean;
      prompt: string;
      options: string[] | null;
    };

export type InlineSpan =
  | { kind: "text"; value: string }
  | { kind: "em"; value: string }
  | { kind: "strong"; value: string };

/** Teach hooks are stored as light markdown: *italic* and **bold** only. */
export function parseInlineMarks(source: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let text = "";
  let index = 0;

  const flush = () => {
    if (!text) return;
    spans.push({ kind: "text", value: text });
    text = "";
  };

  while (index < source.length) {
    if (source.startsWith("**", index)) {
      const end = source.indexOf("**", index + 2);
      if (end === -1) {
        text += "*";
        index += 1;
        continue;
      }
      flush();
      spans.push({ kind: "strong", value: source.slice(index + 2, end) });
      index = end + 2;
      continue;
    }
    if (source[index] === "*") {
      const end = source.indexOf("*", index + 1);
      if (end <= index + 1) {
        text += "*";
        index += 1;
        continue;
      }
      flush();
      spans.push({ kind: "em", value: source.slice(index + 1, end) });
      index = end + 1;
      continue;
    }
    text += source[index];
    index += 1;
  }
  flush();
  return spans;
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function teachView(content: Record<string, unknown>): {
  lead: string;
  examples: string[];
  closing: string | null;
} | null {
  const structuredLead = stringOf(content.lead);
  if (structuredLead) {
    return {
      lead: structuredLead,
      examples: stringList(content.examples),
      closing: stringOf(content.closing) || null,
    };
  }
  const hook = stringOf(content.hook);
  if (!hook) return null;
  return parseHookStructure(hook);
}

export function mcqOptions(item: DrillItem): string[] | null {
  const raw = item.content.mcq;
  if (!Array.isArray(raw)) return null;
  const options = raw.filter(
    (option): option is string => typeof option === "string" && option.trim() !== "",
  );
  return options.length > 0 ? options : null;
}

/** First round of a brand-new item only. */
export function mcqAllowed(item: DrillItem, state: DrillItemState | undefined): boolean {
  if (!mcqOptions(item)) return false;
  return !state || !state.mcqUsed;
}

/** A re-test: the student has practiced this item before. */
export function isRepaso(state: DrillItemState | undefined): boolean {
  return state != null;
}

export function toSessionItem(
  item: DrillItem,
  state: DrillItemState | undefined,
): SessionItem | null {
  const repaso = isRepaso(state);
  if (item.format === "teach") {
    const teach = teachView(item.content);
    return teach
      ? {
          id: item.id,
          format: "teach",
          repaso: false,
          lead: teach.lead,
          examples: teach.examples,
          closing: teach.closing,
        }
      : null;
  }
  const options = mcqAllowed(item, state) ? mcqOptions(item) : null;
  if (item.format === "cloze") {
    const text = stringOf(item.content.text);
    return text ? { id: item.id, format: "cloze", repaso, text, options } : null;
  }
  if (item.format === "translation") {
    const prompt = stringOf(item.content.prompt);
    return prompt
      ? { id: item.id, format: "translation", repaso, prompt, options }
      : null;
  }
  return null;
}

export function collectionCountOf(state: Iterable<DrillItemState>): number {
  let count = 0;
  for (const row of state) if (row.status === "graduated") count += 1;
  return count;
}

/** Tu colección: graduated items. A read failure is logged and reads as zero. */
export async function countCollection(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("drill_item_state")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "graduated");

  if (error) {
    console.error("countCollection failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
