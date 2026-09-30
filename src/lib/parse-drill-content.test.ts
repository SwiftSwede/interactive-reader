import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  matchExistingDrillItem,
  parseDrillMarkdown,
  parseHookStructure,
  teachSeedContent,
} from "./parse-drill-content";

const DIR = path.join(process.cwd(), "docs/drill-content");

async function hookOf(name: string): Promise<string> {
  const markdown = await readFile(path.join(DIR, name), "utf8");
  return parseDrillMarkdown(markdown, name).teach.hook;
}

test("make-vs-do splits to lead, two example groups, and a closing aside", async () => {
  const parsed = parseHookStructure(await hookOf("make-vs-do.md"));
  assert.equal(parsed.examples.length, 2);
  assert.match(parsed.lead, /\*hacer\*/);
  assert.match(parsed.lead, /\*\*MAKE\*\*/);
  assert.match(parsed.lead, /\*\*DO\*\*/);
  assert.match(parsed.lead, /el trabajo:/);
  assert.equal(
    parsed.examples[0],
    "I'll make some pancakes for breakfast. He made a chair out of wood.",
  );
  assert.equal(
    parsed.examples[1],
    "Do your homework. What do you like to do in your free time?",
  );
  assert.match(parsed.closing ?? "", /excepciones/);
  assert.doesNotMatch(parsed.lead, /pancakes/);
});

test("age-expression and present-perfect are lead-only (no em-dash example groups)", async () => {
  const age = parseHookStructure(await hookOf("age-expression.md"));
  assert.deepEqual(age.examples, []);
  assert.equal(age.closing, null);
  assert.match(age.lead, /\*I have 29 years\*/);
  assert.match(age.lead, /\*\*BE\*\*/);

  const perfect = parseHookStructure(await hookOf("present-perfect.md"));
  assert.deepEqual(perfect.examples, []);
  assert.equal(perfect.closing, null);
  assert.match(perfect.lead, /\*I have tried ceviche\*/);
  assert.match(perfect.lead, /\*\*ahora\*\*/);
});

test("bare italics stay in the lead; only em-dash italics become examples", () => {
  const parsed = parseHookStructure(
    "En español, *hacer* lo hace todo. Usa **MAKE** — *I'll make pancakes.* Cierra aquí.",
  );
  assert.equal(parsed.examples.length, 1);
  assert.equal(parsed.examples[0], "I'll make pancakes.");
  assert.match(parsed.lead, /\*hacer\*/);
  assert.doesNotMatch(parsed.lead, /pancakes/);
  assert.equal(parsed.closing, "Cierra aquí.");
});

test("a hook with zero example groups is valid lead-only", () => {
  const parsed = parseHookStructure("Solo **MAKE** y *hacer*.");
  assert.deepEqual(parsed, {
    lead: "Solo **MAKE** y *hacer*.",
    examples: [],
    closing: null,
  });
});

test("teach seed content is structured; re-run matches the same teach row", async () => {
  const markdown = await readFile(path.join(DIR, "make-vs-do.md"), "utf8");
  const parsed = parseDrillMarkdown(markdown, "make-vs-do.md");
  const content = teachSeedContent(parsed.teach);
  assert.equal(typeof content.lead, "string");
  assert.equal(Array.isArray(content.examples), true);
  assert.equal((content.examples as string[]).length, 2);
  assert.equal(typeof content.closing, "string");
  assert.equal(content.hook, undefined);

  const existing = [
    { id: "teach-1", format: "teach", content: { hook: "old paragraph" } },
    { id: "cloze-1", format: "cloze", content: { text: "I need to ___." } },
  ];
  const first = matchExistingDrillItem(existing, { format: "teach", content });
  const second = matchExistingDrillItem(existing, { format: "teach", content });
  assert.equal(first?.id, "teach-1");
  assert.equal(second?.id, "teach-1");
});
