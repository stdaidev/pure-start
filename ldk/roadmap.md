# LDK Roadmap

Roadmap inicial sugerido (rode /ldk-roadmap para consolidar e ordenar por dependencia).

## Ordem proposta (do spec, secao 13)
1. F0 - Design system dark terminal/HUD (tokens, fontes, tratamentos base)
2. F1 - Base: schema + secrets + layout (consome tokens de F0)
3. F2 - Contratos + Conexoes (Evolution)
4. F3 - Runtime do agente + modulo Agentes
5. F4 - Conversas/inbox + handoff
6. F5 - Contatos e Planilhas
7. F6 - Disparos + worker pg_cron
8. F7 - Dashboard + Configuracoes

## Bloqueios conhecidos
- F0 nao tem bloqueio externo (so frontend). Deve entrar antes de F1 para o layout ja nascer no visual final.
- Todas as features F1-F7 dependem de [VERIFY] Lovable Cloud habilitado.
- F2 depende de [VERIFY] EVOLUTION_BASE_URL + EVOLUTION_API_KEY + URL publica para webhook.
- F3 depende de F2 + [VERIFY] OPENAI_API_KEY + ELEVENLABS_API_KEY.
- F6 depende de F2 (para enviar) e F5 (para dados).
