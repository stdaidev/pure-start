import assert from "node:assert/strict";
import test from "node:test";

import { getTool } from "../src/providers/tools/registry.server.ts";

test("tool rejeita argumentos invalidos sem consultar banco ou expor detalhes", async () => {
  const tool = getTool("transferir_humano");
  assert.ok(tool);

  const result = await tool.handler(
    { reason: "x".repeat(501), unexpected: "segredo" },
    {
      workspaceId: "00000000-0000-0000-0000-000000000001",
      conversationId: "00000000-0000-0000-0000-000000000002",
    },
  );

  assert.deepEqual(result, { ok: false, message: "argumentos invalidos" });
  assert.equal(JSON.stringify(result).includes("segredo"), false);
});
