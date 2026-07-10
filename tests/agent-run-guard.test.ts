import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAgentRunState } from "../src/lib/agent-run-guard.ts";

const expected = {
  messageId: "message-1",
  runToken: "token-1",
  agentId: "agent-1",
  connectionId: "connection-1",
  contactId: "contact-1",
};

const current = {
  assignedTo: null,
  agentId: "agent-1",
  agentActive: true,
  latestMessageId: "message-1",
  runToken: "token-1",
  connectionId: "connection-1",
  contactId: "contact-1",
};

test("autoriza somente o mesmo ownership e snapshot", () => {
  assert.equal(evaluateAgentRunState(current, expected), null);
});

test("bloqueia token ou mensagem obsoletos", () => {
  assert.equal(
    evaluateAgentRunState({ ...current, runToken: "token-2" }, expected),
    "skipped-stale",
  );
  assert.equal(
    evaluateAgentRunState({ ...current, latestMessageId: "message-2" }, expected),
    "skipped-stale",
  );
});

test("bloqueia handoff, agente inativo e troca de contexto", () => {
  assert.equal(
    evaluateAgentRunState({ ...current, assignedTo: "human" }, expected),
    "skipped-human",
  );
  assert.equal(
    evaluateAgentRunState({ ...current, agentActive: false }, expected),
    "skipped-inactive",
  );
  assert.equal(
    evaluateAgentRunState({ ...current, connectionId: "connection-2" }, expected),
    "skipped-stale",
  );
});
