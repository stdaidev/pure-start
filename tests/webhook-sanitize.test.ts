import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeEvolutionWebhookPayload } from "../src/lib/evolution-webhook.server.ts";

test("remove credenciais, telefone, texto e base64 do payload persistido", () => {
  const sanitized = sanitizeEvolutionWebhookPayload({
    apikey: "secret",
    sender: "5511999999999@s.whatsapp.net",
    data: {
      message: {
        conversation: "conteudo privado",
        imageMessage: { base64: "very-long-private-data", caption: "privado" },
      },
    },
  }) as Record<string, unknown>;

  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("5511999999999"), false);
  assert.equal(serialized.includes("conteudo privado"), false);
  assert.equal(serialized.includes("very-long-private-data"), false);
});
