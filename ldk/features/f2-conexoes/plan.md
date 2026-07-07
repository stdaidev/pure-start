# F2 - Contratos modulares + EvolutionProvider + modulo Conexoes

Risk: alto
Proof required: P4
Ceremony: alto (plano completo, risco/seguranca explicito, execucao via `ldk-build-task` checkpoint por checkpoint).

## Acceptance criteria
- AC1: Contrato `ChannelProvider` completo + `EvolutionProvider` implementa todos os metodos.
- AC2: `/conexoes` lista conexoes com badge HUD de status.
- AC3: Criar conexao gera QR real Evolution em <5s + polling.
- AC4: Status muda para `connected` sem reload ao parear.
- AC5: Webhook publico valida token (timingSafeEqual), 200 persiste, 401 sem PII.
- AC6: Desconectar limpa Evolution + linha local.
- AC7: Nenhuma chave Evolution no bundle client.
- AC8: `supabase--linter` limpo.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Coletar segredos F2: registrar `EVOLUTION_BASE_URL` e `EVOLUTION_API_KEY` via add_secret; confirmar `WEBHOOK_VERIFY_TOKEN` (ja gerado em F1). | AC7 | (nenhum arquivo; secrets store) | `fetch_secrets` lista as 3 chaves. | blocked |
| T2 | Contrato `ChannelProvider` (interface + tipos QR/Status/Message) e stub de registry. | AC1 | `src/providers/channel/types.ts`, `src/providers/channel/registry.ts` | `tsgo` verde, importavel. | done |
| T3 | `EvolutionProvider` server-only implementando o contrato (fetch REST, timeouts 5s, sem log PII). | AC1, AC7 | `src/providers/channel/evolution.server.ts` | `tsgo` verde; import protegido (nao entra no bundle client). | done |
| T4 | Server functions `createConnection`, `getConnectionStatus`, `refreshQr`, `deleteConnection`, `listConnections` usando EvolutionProvider. | AC3, AC4, AC6 | `src/lib/connections.functions.ts` | Chamada via `useServerFn` retorna QR base64; erros mapeados. | done |
| T5 | Server route publica webhook Evolution: valida token (timingSafeEqual), persiste em `webhook_events` + projeta em `messages`/`contacts`/`conversations`, 200/401. Idempotente por `external_id`. | AC5 | `src/routes/api/public/evolution.webhook.ts`, migration `webhook_events` | curl testado: token errado -> 401; token correto -> 200 + contato/conversa/mensagem persistidos; duplicata nao cria linha extra. | done |
| T6 | UI `/conexoes`: lista + modal nova conexao com QR + polling `useQuery` refetchInterval 3s + acoes refresh/deletar. Badge HUD de status. | AC2, AC3, AC4, AC6 | `src/routes/_shell.conexoes.tsx`, `src/components/conexoes/*` | Playwright: abre `/conexoes`, cria conexao, QR renderiza; screenshot. | done |
| T7 | Prova P4: Playwright fim-a-fim (screenshots), curl webhook (valido+invalido), `supabase--linter`, `grep` bundle sem `EVOLUTION_API_KEY`, escrever `proof.md`. | AC1-AC8 | `ldk/features/f2-conexoes/proof.md` | Todos os checks executados e registrados. | done |

## Estrategia de execucao
- Modo recomendado: `ldk-build-task` (risco alto + integracao externa + webhook publico). Cada task e checkpoint.
- T1 deve rodar primeiro; sem segredos, T3+ ficam blocked.
- T5 (webhook) exige revisao de seguranca antes de commit.

## Riscos
- Evolution API instavel: timeouts curtos, UI resiliente.
- Webhook publico: token obrigatorio, sem PII em log/response.
- Chaves no bundle: separar `.server.ts` estritamente; T7 valida por grep.
- RLS anon aberto em `messages`/`webhook_events`: aceito v1; documentado em F1.

## Prova
- Playwright: `/conexoes` abre, nova conexao gera QR, badge atualiza (com Evolution real ou mock).
- curl: POST webhook com token valido (200) e invalido (401).
- `supabase--linter` limpo.
- `grep -r EVOLUTION_API_KEY dist/` vazio apos build.
- Screenshot da lista + QR modal em `ldk/features/f2-conexoes/proof.md`.

## Status ledger
`done` (proof em `ldk/features/f2-conexoes/proof.md`).