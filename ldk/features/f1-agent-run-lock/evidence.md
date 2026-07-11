# F1 Evidence - 2026-07-10

Status: PARTIAL

## Implementacao observada

- Migration aditiva com token de ownership, reclaim em 10 minutos e release condicionado ao mesmo token.
- Tick propaga `run_token`; runtime revalida snapshot antes de typing e de cada envio.
- Handoff, agente/conexao inativos, troca de mensagem/contato/conexao e blocklist interrompem o run.
- Chave publicavel do Supabase nao autoriza mais o tick.

## Evidencia local

- `npx tsc --noEmit`: pass.
- `npm run lint`: pass com 6 warnings Fast Refresh de componentes shadcn, zero erros.
- `node --test tests/*.test.ts`: cenarios puros de ownership, blocklist/telefone e auth interna passam.
- `npm run build`: pass.

## Lacuna para P4

AC1, AC2 e AC5 dependem da migration aplicada e de dois claims reais concorrentes em Supabase de staging. Nao houve
execucao contra banco remoto nem envio real nesta revisao. A feature nao deve ser marcada `done` antes dessa prova e
do CI do commit publicado.

## Evidencia remota - 2026-07-11

- Migration aplicada no Lovable Cloud; colunas e assinaturas verificadas.
- Claim gera token; release divergente preserva ownership; release correto limpa o token.
- API publicada rejeita ausencia de token e chave publicavel com `401`.
- AC5 continua pendente: nao houve dois runtimes concorrentes com provider mockado comprovando no maximo um efeito.
