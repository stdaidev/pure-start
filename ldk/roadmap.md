# LDK Roadmap

## Estado atual
- F0 done, F2 done, F3 partial (funcional em producao, falta P4 automatizado), F1 partial.
- Proxima recomendada: **F4 - Conversas/inbox + handoff**. Ja existe dado em `messages`/`conversations`
  produzido pelo runtime; F4 fecha o loop humano.

## Readiness
- ready: F4 (Conversas/inbox + handoff), F5 (Contatos e Planilhas).
- blocked: F6 (Disparos) depende de F5 pronto e de anti-ban revisado.
- later: F7 (Dashboard + Configuracoes) - polimento pos-MVP.
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- done: F0, F2.
- partial: F1, F3.

## Bloqueios conhecidos
- F1 partial: rever se algo de schema/layout ainda impede F4/F5.
- F6 depende de F2 (envio) + F5 (contatos) + anti-ban.
