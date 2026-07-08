# LDK Roadmap

## Estado atual
- F0 done, F2 done, F4 done, F5 done, F6 partial (happy-path `sent` manual pos-release),
  F1 partial, F3 partial (funcional em producao, falta P4 automatizado).
- Proxima recomendada: **F7 - Dashboard + Configuracoes + polimento**.

## Readiness
- ready: F7 (Dashboard + Configuracoes).
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- verify: happy-path `sent=success` de F6 com numero de teste real pos-release.
- done: F0, F2, F4, F5.
- partial: F1, F3, F6.

## Bloqueios conhecidos
- F1 partial: rever se algo de schema/layout ainda impede F4/F5.
- F6 partial: verificar envio real via Evolution com numero de teste antes do release.
