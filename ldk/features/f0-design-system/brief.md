# F0 - Design system dark terminal/HUD

## Objetivo
Aplicar identidade visual "terminal/HUD premium dark-first" ao app: fundo quase-preto, acento laranja neon, tipografia mono para dados, glass cards com brackets e grid sutil. Sem mudar funcionalidade.

## Usuario
Operador unico da v1. Vai enxergar a UI toda no visual final desde a primeira tela funcional (F1+).

## Escopo
- Tokens OKLCH em src/styles.css (bloco :root dark + .light opcional).
- Fontes Google via <link> em src/routes/__root.tsx: Space Grotesk, JetBrains Mono, Inter.
- Mapear fontes em @theme (--font-display, --font-mono, --font-sans) para uso em utilitarios Tailwind.
- Utilitarios base: .glass-card, .hud-brackets, .bg-hud-grid, selection laranja translucida.
- App abre no dark (classe `dark` no <html>).
- Aplicar visual minimo na tela inicial atual ("Iniciar") apenas para validar tokens/fontes.

## Fora de escopo
- Sidebar, layout de app, componentes de negocio (F1+).
- Toggle claro/escuro funcional (basta os tokens .light existirem).
- Ruido SVG (opcional, fica para polimento em F7).
- Fade-up de secao (opcional, fica para F7).
- Qualquer animacao sobre texto (PROIBIDO).

## Criterios de aceite
- AC1: `src/styles.css` tem os tokens OKLCH exatos do intake em :root, e bloco .light opcional.
- AC2: `--font-display`, `--font-mono`, `--font-sans` registrados em @theme e resolvem para Space Grotesk / JetBrains Mono / Inter.
- AC3: Fontes carregadas via <link> no __root.tsx (preconnect + stylesheet), sem @import de URL em styles.css.
- AC4: <html> abre com classe `dark` (dark-first).
- AC5: Existem utilitarios .glass-card (blur+borda laranja translucida+rounded-2xl+hover com glow sutil sem loop), .hud-brackets (cantos em L via ::before/::after estaticos), .bg-hud-grid (grid 60x60 laranja ~5% opacidade estatico), ::selection laranja translucido.
- AC6: Tela inicial atual mostra "Iniciar" usando Space Grotesk (display) sobre background quase-preto, com acento visivel laranja (ex.: um pequeno bracket ou dot), sem nenhum flicker/shimmer/blink/marquee.
- AC7: Nenhum warning novo no console; build passa.

## Risco
baixo (so frontend, sem backend, sem PII).

## Prova minima
P1 - screenshot do preview mostrando tela inicial no novo visual + inspecao rapida de que fonte display e Space Grotesk.