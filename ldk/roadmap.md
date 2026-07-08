# LDK Roadmap

## Estado atual
- F0 done, F2 done, F4 done, F5 done, F6 partial (happy-path `sent` manual pos-release),
  F1 partial, F3 partial (funcional em producao, falta P4 automatizado).
- Proxima recomendada: **F6.1 - Anti-ban hardening + multi-instancia** (fecha gaps do F6 antes de escalar disparo real).

## Readiness
- ready: F6.1 (approved, `ldk-build-task` por task), F7 (Dashboard + Configuracoes).
- verify: fechar P4 de F3 (teste E2E automatizado + CI) pode virar item proprio de hardening antes do release.
- verify: happy-path `sent=success` de F6 com numero de teste real pos-release.
- done: F0, F2, F4, F5.
- partial: F1, F3, F6.

## Bloqueios conhecidos
- F1 partial: rever se algo de schema/layout ainda impede F4/F5.
- F6 partial: verificar envio real via Evolution com numero de teste antes do release.
- F6.1 depende de F6 (ok, partial ja usavel) e F4 (done); libera hardening antes de escalar volume.
- F6.2 (idea): cooldown por lead (nao enviar para quem teve inbound nos ultimos X); janela configuravel em horas OU dias (seletor de unidade). Combina bloqueio duro global no create/tick com flag opcional por campanha para operador escolher se aplica.
