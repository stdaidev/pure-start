import assert from "node:assert/strict";
import test from "node:test";

import { normalizePhone, phoneVariantsBR } from "../src/lib/phone.ts";

test("normaliza telefone brasileiro sem DDI", () => {
  assert.equal(normalizePhone("(11) 98765-4321"), "5511987654321");
});

test("gera variantes BR com e sem DDI e nono digito", () => {
  const variants = new Set(phoneVariantsBR("5511987654321"));
  assert.ok(variants.has("5511987654321"));
  assert.ok(variants.has("11987654321"));
  assert.ok(variants.has("551187654321"));
  assert.ok(variants.has("1187654321"));
});

test("nao gera variantes para entrada vazia", () => {
  assert.deepEqual(phoneVariantsBR(""), []);
});
