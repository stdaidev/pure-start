import type { LlmProvider, LlmProviderId } from "./types";

/**
 * Registry client-safe de LLM providers.
 * Implementacoes concretas se registram em modulos `*.server.ts`
 * (ex.: `openai.server.ts`) via `registerLlmProvider`.
 */

const registry = new Map<LlmProviderId, LlmProvider>();

export function registerLlmProvider(provider: LlmProvider): void {
  registry.set(provider.id, provider);
}

export function getLlmProvider(id: LlmProviderId): LlmProvider {
  const p = registry.get(id);
  if (!p) {
    throw new Error(`LLM provider not registered: ${id}`);
  }
  return p;
}

export function listLlmProviderIds(): LlmProviderId[] {
  return Array.from(registry.keys());
}