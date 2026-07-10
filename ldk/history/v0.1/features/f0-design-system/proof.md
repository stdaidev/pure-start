# F0 - Design system dark terminal/HUD - Proof

## Pre-flight
Otimista:
- Plano curto, so frontend, sem PII/backend, tasks coordenadas.
- Tailwind v4 ja tinha @theme inline pronto para receber --font-*.

Pessimista:
- Precisava manter @custom-variant dark funcional (mantido: <html> abre com class="dark").
- Nao podia @import URL de Google Fonts em styles.css (resolvido via <link> no __root.tsx).
- @utility precisa ser top-level (respeitado).

Decisao: proceed.

## Arquivos alterados
- src/styles.css (tokens OKLCH dark-first, --font-display/--font-mono/--font-sans em @theme, .light opcional, ::selection laranja, utilitarios .glass-card, .hud-brackets, .bg-hud-grid).
- src/routes/__root.tsx (preconnect+stylesheet Google Fonts para Space Grotesk/JetBrains Mono/Inter; lang="pt-BR" e className="dark" no <html>).
- src/routes/index.tsx (home nova: bg-hud-grid + glass-card + hud-brackets + dot laranja + "Iniciar" em font-display + "READY // v0.1" em font-mono).

## AC cobertos
- AC1 (tokens OKLCH em :root e .light): OK.
- AC2 (@theme mapeia display/mono/sans): OK. `getComputedStyle(h1).fontFamily = "Space Grotesk", ui-sans-serif, system-ui, sans-serif`.
- AC3 (fontes via <link>, sem @import URL): OK.
- AC4 (<html class="dark">): OK. Runtime: `document.documentElement.className = "dark"`.
- AC5 (utilitarios .glass-card / .hud-brackets / .bg-hud-grid + ::selection laranja): OK.
- AC6 (home nova no visual, sem animacao sobre texto): OK. Screenshot em /tmp/browser/f0/home.png mostra fundo quase-preto, grid laranja sutil, glass card com brackets em L, dot laranja com glow fixo, "Iniciar" em Space Grotesk e "READY // v0.1" em JetBrains Mono. Nenhum flicker/shimmer/blink/marquee.
- AC7 (sem warning novo relevante): OK. Unico ruido no console e hydration mismatch de `data-tsd-source` (linhas do dev HMR), nao introduzido por esta feature e sem impacto visual.

## Verificacao executada
- Preview aberto via Playwright em http://localhost:8080.
- Runtime checks:
  - `getComputedStyle(document.body).backgroundColor = "oklch(0.15 0 0)"` (background token aplicado).
  - `getComputedStyle(h1).fontFamily` inicia com "Space Grotesk".
  - `document.documentElement.className = "dark"`.
- Screenshot da home: /tmp/browser/f0/home.png (verificado visualmente).

## Veredito otimista
Visual bate com o intake: dark terminal, acento laranja, glass + brackets + grid, tipografia display/mono corretas, tudo estatico.

## Veredito pessimista
- Hydration mismatch de `data-tsd-source` no console (ruido do template dev, nao do F0). Nao virou regressao mas fica registrado.
- .light so tem tokens; nao ha toggle funcional (fora de escopo).
- Fontes Google via CDN (bloqueio de rede quebra fallback, mas fallbacks system-ui/monospace/sans-serif estao definidos).

## LDK self-check
- Prova real (preview + screenshot + inspecao runtime), nao inventada.
- Nenhum segredo, PII, auth, pagamento tocados.
- Sem alteracao no motor LDK.
- Escopo respeitado (nada de sidebar, rota nova ou toggle).

## Status
DONE
Proof level achieved: P1 (exigido: P1).