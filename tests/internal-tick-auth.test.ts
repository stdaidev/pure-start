import assert from "node:assert/strict";
import test from "node:test";

import { authorizeInternalTick, readTickCredential } from "../src/lib/internal-tick-auth.ts";

test("aceita bearer ou header interno com segredo server-only", () => {
  const bearer = new Request("https://example.test/tick", {
    headers: { authorization: "Bearer secret-value" },
  });
  const header = new Request("https://example.test/tick", {
    headers: { "x-internal-token": "secret-value" },
  });
  const env = { INTERNAL_TICK_TOKEN: "secret-value" };
  assert.equal(authorizeInternalTick(bearer, env), "authorized");
  assert.equal(authorizeInternalTick(header, env), "authorized");
  assert.equal(readTickCredential(bearer), "secret-value");
});

test("rejeita chave publica e diferencia servidor sem segredo", () => {
  const request = new Request("https://example.test/tick", {
    headers: { apikey: "public-anon-key" },
  });
  assert.equal(authorizeInternalTick(request, { INTERNAL_TICK_TOKEN: "private" }), "unauthorized");
  assert.equal(authorizeInternalTick(request, {}), "misconfigured");
});

test("permite WEBHOOK_VERIFY_TOKEN como fallback secreto de migracao", () => {
  const request = new Request("https://example.test/tick", {
    headers: { apikey: "webhook-secret" },
  });
  assert.equal(
    authorizeInternalTick(request, { WEBHOOK_VERIFY_TOKEN: "webhook-secret" }),
    "authorized",
  );
});
