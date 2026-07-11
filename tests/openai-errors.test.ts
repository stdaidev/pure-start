import assert from "node:assert/strict";
import test from "node:test";

import { openAiErrorFromStatus, openAiRetryDelayMs } from "../src/providers/llm/openai-errors.ts";
import { completeOpenAi } from "../src/providers/llm/openai.server.ts";

const input = {
  model: "gpt-4.1-mini",
  messages: [{ role: "user" as const, content: "teste" }],
};

test("classifica rate limit e erro de servidor como retryable", () => {
  assert.deepEqual(
    {
      code: openAiErrorFromStatus(429).code,
      retryable: openAiErrorFromStatus(429).retryable,
    },
    { code: "openai_rate_limited", retryable: true },
  );
  assert.equal(openAiErrorFromStatus(503).code, "openai_server_error");
  assert.equal(openAiErrorFromStatus(503).retryable, true);
});

test("nao repete erro de autenticacao ou requisicao invalida", () => {
  assert.equal(openAiErrorFromStatus(401).retryable, false);
  assert.equal(openAiErrorFromStatus(400).retryable, false);
});

test("backoff e limitado e deterministico", () => {
  assert.equal(openAiRetryDelayMs(0), 200);
  assert.equal(openAiRetryDelayMs(1), 500);
  assert.equal(openAiRetryDelayMs(10), 500);
});

test("repete 429 de forma limitada e retorna quando o provider recupera", async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await completeOpenAi(input, "test-key", {
    fetchImpl: async () => {
      calls++;
      if (calls < 3) return new Response(null, { status: 429 });
      return Response.json({
        choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      });
    },
    sleepImpl: async (ms) => {
      delays.push(ms);
    },
  });

  assert.equal(result.text, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [200, 500]);
});

test("nao repete 400 nem expoe o corpo da resposta", async () => {
  let calls = 0;
  await assert.rejects(
    completeOpenAi(input, "test-key", {
      fetchImpl: async () => {
        calls++;
        return new Response("prompt-sensivel", { status: 400 });
      },
      sleepImpl: async () => undefined,
    }),
    (error: unknown) => {
      assert.equal(calls, 1);
      assert.equal((error as Error).message.includes("prompt-sensivel"), false);
      return true;
    },
  );
});
