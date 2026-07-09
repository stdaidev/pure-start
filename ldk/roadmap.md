# LDK Roadmap

## Estado atual
- F0, F1, F2, F4, F5, F6, F6.1, F6.2, F7, F9, Fhot, Fabc, F10, F11 => done.
- F3, F8 => partial (funcional em producao, falta prova P4/AC6 respectivamente).
- F12 => planned (tools de IA com aprovacao, depende de fila de approval).
- Proxima recomendada: **F12** (tools do agente com fila de aprovacao) ou
  fechar AC6 de F8 e hardening P4 de F3.

## Readiness
- verify: F8 (rodar teste manual AC6 no WhatsApp para promover a done).
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- ready: F12 (planejar tools + fila de approval).
- done: F0, F1, F2, F4, F5, F6, F6.1, F6.2, F7, F9, Fhot, Fabc, F10, F11.
- partial: F3, F8.

## Bloqueios conhecidos
- F1 partial: rever se algo de schema/layout ainda impede F4/F5.
- F8 partial: depende de teste manual ponta-a-ponta no WhatsApp e, se o
  Evolution apontar para a URL publicada, publicar a versao nova para o
  webhook externo usar a correcao persistente.
