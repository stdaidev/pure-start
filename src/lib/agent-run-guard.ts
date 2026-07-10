export type AgentRunStopStatus =
  "skipped-human" | "skipped-inactive" | "skipped-no-agent" | "skipped-stale";

export interface AgentRunExpectedState {
  messageId: string;
  runToken: string;
  agentId: string;
  connectionId: string;
  contactId: string;
}

export interface AgentRunCurrentState {
  assignedTo: string | null;
  agentId: string | null;
  agentActive: boolean | null;
  latestMessageId: string | null;
  runToken: string | null;
  connectionId: string | null;
  contactId: string | null;
}

export function evaluateAgentRunState(
  current: AgentRunCurrentState,
  expected: AgentRunExpectedState,
): AgentRunStopStatus | null {
  if (current.runToken !== expected.runToken || current.latestMessageId !== expected.messageId) {
    return "skipped-stale";
  }
  if (current.assignedTo) return "skipped-human";
  if (!current.agentId) return "skipped-no-agent";
  if (
    current.agentId !== expected.agentId ||
    current.connectionId !== expected.connectionId ||
    current.contactId !== expected.contactId
  ) {
    return "skipped-stale";
  }
  if (current.agentActive !== true) return "skipped-inactive";
  return null;
}
