import type { ChannelProvider } from "./types";

/**
 * Registry client-safe de metadados de provedores.
 * Nao instancia providers reais (que sao server-only).
 * Implementacoes concretas se registram via `registerChannelProvider`
 * em modulos `*.server.ts`, e a rota/server function resolve por id.
 */

export type ChannelProviderId = "evolution";

const registry = new Map<ChannelProviderId, ChannelProvider>();

export function registerChannelProvider(id: ChannelProviderId, provider: ChannelProvider): void {
  registry.set(id, provider);
}

export function getChannelProvider(id: ChannelProviderId): ChannelProvider {
  const p = registry.get(id);
  if (!p) {
    throw new Error(`Channel provider not registered: ${id}`);
  }
  return p;
}

export function listChannelProviderIds(): ChannelProviderId[] {
  return Array.from(registry.keys());
}
