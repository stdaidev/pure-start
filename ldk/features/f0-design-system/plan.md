# F0 - Design system dark terminal/HUD - Plan

## Feature
F0 - Design system dark terminal/HUD

## Risk
baixo

## Proof required
P1

## Cerimonia
baixo - plano curto, poucas tasks coordenadas, prova visual.

## Acceptance criteria
- AC1: tokens OKLCH em :root e .light em src/styles.css conforme intake.
- AC2: @theme mapeia --font-display (Space Grotesk), --font-mono (JetBrains Mono), --font-sans (Inter).
- AC3: fontes carregadas via <link> preconnect+stylesheet em src/routes/__root.tsx (nao @import URL).
- AC4: <html lang> abre com classe `dark`.
- AC5: utilitarios .glass-card, .hud-brackets, .bg-hud-grid e ::selection laranja translucido definidos em styles.css.
- AC6: tela inicial "Iniciar" renderizada no visual novo, com Space Grotesk no titulo, background quase-preto e um detalhe laranja estatico. Sem animacao sobre texto.
- AC7: sem warning novo no console, build ok.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Substituir tokens em src/styles.css pelos OKLCH do intake (:root dark + .light), mapear --font-display/--font-mono/--font-sans em @theme inline, adicionar ::selection laranja translucido | AC1, AC2 | `src/styles.css` | inspecao do arquivo + preview carrega sem erro | done |
| T2 | Adicionar <link> preconnect Google Fonts + stylesheet (Space Grotesk, JetBrains Mono, Inter) no head() de src/routes/__root.tsx e setar className="dark" no <html> do RootShell | AC3, AC4 | `src/routes/__root.tsx` | preview: DevTools mostra <html class="dark"> e Network baixando as 3 fontes | done |
| T3 | Adicionar utilitarios @utility .glass-card, .hud-brackets, .bg-hud-grid em src/styles.css (todos estaticos, sem animacao sobre texto; glow sutil no hover do card apenas via box-shadow) | AC5 | `src/styles.css` | inspecao + smoke visual | done |
| T4 | Atualizar src/routes/index.tsx: fundo bg-hud-grid, card central .glass-card + .hud-brackets, titulo "Iniciar" em font-[--font-display] com um pequeno dot/bracket laranja estatico ao lado. Sem animacao. | AC6 | `src/routes/index.tsx` | preview: screenshot da tela inicial no novo visual | done |
| T5 | Rodar prova P1: abrir preview, tirar screenshot da home, checar console sem warnings novos, confirmar Space Grotesk aplicada no titulo | AC6, AC7 | - | preview + console | done |

## Arquivos criados/alterados (esperados)
- src/styles.css
- src/routes/__root.tsx
- src/routes/index.tsx
- ldk/features/f0-design-system/brief.md (criado)
- ldk/features/f0-design-system/plan.md (criado)
- ldk/features/f0-design-system/proof.md (criado no build)

## Fora de escopo
- Sidebar, rotas novas, componentes de negocio.
- Toggle de tema funcional (so tokens existem).
- Ruido SVG e fade-up de secao (ficam para F7).

## Modo de execucao recomendado
ldk-build (baixo risco, tasks coordenadas, prova P1 visual).

## Roadmap/dependencias
F0 nao tem dependencia externa. Deve entrar antes de F1 para o layout de F1 ja nascer no visual final.

## Status no ledger
planned -> approved (apos confirmacao do usuario).