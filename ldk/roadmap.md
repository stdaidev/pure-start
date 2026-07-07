# LDK Roadmap

Roadmap inicial sugerido (rode /ldk-roadmap para consolidar e ordenar por dependencia).

## Ordem proposta (do spec, secao 13)
1. F1 - Base: schema + secrets + layout
2. F2 - Contratos + Conexoes (Evolution)
3. F3 - Runtime do agente + modulo Agentes
4. F4 - Conversas/inbox + handoff
5. F5 - Contatos e Planilhas
6. F6 - Disparos + worker pg_cron
7. F7 - Dashboard + Configuracoes

## Bloqueios conhecidos
- Todas as features F1-F7 dependem de [VERIFY] Lovable Cloud habilitado.
- F2 depende de [VERIFY] EVOLUTION_BASE_URL + EVOLUTION_API_KEY + URL publica para webhook.
- F3 depende de F2 + [VERIFY] OPENAI_API_KEY + ELEVENLABS_API_KEY.
- F6 depende de F2 (para enviar) e F5 (para dados).
