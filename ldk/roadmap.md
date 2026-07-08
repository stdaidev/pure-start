# LDK Roadmap

## Estado atual
- F0 done, F2 done, F4 done, F5 done, F6 done, F6.1 done, F6.2 done, F7 done.
- F1 partial, F3 partial (funcional em producao, falta P4 automatizado).
- F8 partial: codigo/cron corrigidos (debounce+lock persistentes); AC6 aguarda
  teste manual no WhatsApp (4 mensagens em <2s -> 1 resposta agrupada).
- Proxima recomendada: **fechar AC6 da F8** (validacao manual no WhatsApp) e,
  em seguida, hardening P4 de F3.

## Readiness
- verify: F8 (rodar teste manual AC6 no WhatsApp para promover a done).
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- done: F0, F2, F4, F5, F6, F6.1, F6.2, F7.
- partial: F1, F3, F8.

## Bloqueios conhecidos
- F1 partial: rever se algo de schema/layout ainda impede F4/F5.
- F8 partial: depende de teste manual ponta-a-ponta no WhatsApp e, se o
  Evolution apontar para a URL publicada, publicar a versao nova para o
  webhook externo usar a correcao persistente.
