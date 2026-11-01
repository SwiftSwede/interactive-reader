import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluacionConfig } from "./config";
import { nivelForShare, resultMoreInfoUrl, whatsappPrefill, whatsappResultUrl } from "./whatsapp";

test("nivel is a short label, never the track id", () => {
  assert.equal(nivelForShare("settled", "pre_int"), "A2");
  assert.equal(nivelForShare("gentle", "beginner"), "A1");
  assert.equal(nivelForShare("top", "upper"), "avanzado");
  assert.equal(whatsappPrefill("A2").includes("pre_int"), false);
});

test("prefill is Kyle's sentence with the level dropped in, markup stripped", () => {
  assert.equal(
    whatsappPrefill("B1"),
    "Hice tu evaluación y me dio B1. Quiero saber más sobre el Confident Speaker's Circle",
  );
  assert.equal(whatsappPrefill("<b>A2</b>"), whatsappPrefill("A2"));
});

test("the link uses digits only and a different message from the workshop invite", () => {
  const url = whatsappResultUrl("A2", "+52 155 1234 5678");
  assert.ok(url);
  assert.match(url, /^https:\/\/wa\.me\/5215512345678\?text=/);
  const text = decodeURIComponent(url.split("text=")[1]);
  assert.match(text, /^Hice tu evaluación/);
  assert.equal(text.includes("Unirme al grupo"), false);
  assert.equal(whatsappResultUrl("A2", "   "), null);
  assert.equal(whatsappResultUrl("A2", undefined), null);
});

test("A1 (beginner track) links to the Superpack, not WhatsApp", () => {
  assert.equal(
    resultMoreInfoUrl("gentle", "beginner", undefined),
    evaluacionConfig.beginnerRedirectUrl,
  );
  assert.equal(
    resultMoreInfoUrl("settled", "pre_int", "5215512345678")?.startsWith("https://wa.me/"),
    true,
  );
});
