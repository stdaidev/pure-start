# LDK Roadmap

## Estado atual
- F0, F1, F2, F4, F5, F6, F6.1, F6.2, F7, F9, Fhot, F10, F11 => done.
- F3, F8, Fabc => partial (Fabc precisa RPC atomica + stress test 2 campanhas).
- F12 => planned (tools de IA com aprovacao, depende de fila de approval).
- Proxima recomendada: **F12** (tools do agente com fila de aprovacao) ou
  fechar AC6 de F8, hardening P4 de F3 e promover Fabc a done com RPC atomica.

## Readiness
- verify: F8 (rodar teste manual AC6 no WhatsApp para promover a done).
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- verify: Fabc (rodar 2 campanhas simultaneas na mesma conexao apos RPC atomica).
- ready: F12 (planejar tools + fila de approval).
- done: F0, F1, F2, F4, F5, F6, F6.1, F6.2, F7, F9, Fhot, F10, F11.
- partial: F3, F8, Fabc.

## Bloqueios conhecidos
- F8 partial: depende de teste manual ponta-a-ponta no WhatsApp e, se o
  Evolution apontar para a URL publicada, publicar a versao nova para o
  webhook externo usar a correcao persistente.
- Fabc partial: gate atual e read+write, nao 100% atomico entre workers
  concorrentes. Precisa RPC `try_reserve_connection_slot` com UPDATE
  condicional (WHERE contador < limite RETURNING) antes de virar done.
