# F2 - Contratos modulares + EvolutionProvider + modulo Conexoes

## Objetivo
Estabelecer o contrato `ChannelProvider` (interface tecnica agnostica ao provedor), implementar `EvolutionProvider` como primeira concretizacao, e entregar o modulo Conexoes (UI + edge functions) que permite parear uma instancia Evolution via QR, ver status ao vivo e receber webhooks de mensagens.

## Usuario
Operador unico. Entra em /conexoes, cria instancia, escaneia QR no WhatsApp, ve status mudar para `connected`, mensagens recebidas ja chegam no banco via webhook.

## Escopo
- Contrato `ChannelProvider` em `src/providers/channel/types.ts` (metodos: `createInstance`, `getQrCode`, `getStatus`, `sendText`, `sendAudio`, `handleWebhook`).
- `EvolutionProvider` implementando o contrato, consumindo `EVOLUTION_BASE_URL` + `EVOLUTION_API_KEY` server-side.
- Edge functions publicas em `src/routes/api/public/`:
  - `POST /api/public/evolution/webhook` (recebe eventos Evolution, valida `WEBHOOK_VERIFY_TOKEN` via header/query, persiste em `messages`/`contacts`).
- Server functions autenticaveis (sem auth v1, apenas server-side) em `src/lib/connections.functions.ts`:
  - `createConnection({ name })` -> cria linha em `connections` + chama Evolution para criar instancia, retorna QR base64.
  - `getConnectionStatus({ id })` -> polling do status Evolution + persiste em `connections.status`.
  - `refreshQr({ id })` -> pega novo QR se expirou.
  - `deleteConnection({ id })` -> logout Evolution + delete linha.
- UI `/conexoes`:
  - Lista de conexoes (nome, status badge com dot HUD, ultimo ping).
  - Botao "Nova conexao" -> modal com input nome -> mostra QR + polling de status a cada 3s ate `connected` ou `expired`.
  - Acoes por linha: refresh QR, desconectar/deletar.
- Persistir eventos brutos do webhook em `webhook_events` (auditoria) alem de projetar em `messages`.

## Fora de escopo
- Envio de mensagem pelo operador (F4 inbox).
- Runtime do agente / LLM (F3).
- Multi-provider real (so o contrato + Evolution; outros providers ficam para depois).
- Retry/dead-letter queue sofisticada no webhook (basico: 200 sempre, log de erro).

## Decisoes fixadas
- Provider: Evolution API 2.3.7 (ja em project.md).
- Webhook URL publica: `{project-preview-url}/api/public/evolution/webhook` (stable Lovable URL).
- Verificacao: header `x-webhook-token` == `WEBHOOK_VERIFY_TOKEN` (timingSafeEqual).
- Segredos `EVOLUTION_BASE_URL` + `EVOLUTION_API_KEY`: coletados no inicio de F2 via `add_secret` (nao esperam F7).
- Status polling: client faz `useQuery` refetchInterval 3000ms enquanto QR ativo; server function so consulta Evolution.

## Risco
alto (integracao externa, webhook publico, segredos, PII de telefone/mensagem).

## Prova minima
P4 (script Playwright fim-a-fim + curl no webhook com assinatura valida/invalida + linter Supabase limpo + review de seguranca do webhook + registro no ledger).

## Riscos e mitigacoes
- Webhook publico sem auth: verificacao HMAC/token obrigatoria, timingSafeEqual, 401 sem log de PII.
- Evolution instavel/nao oficial: timeouts curtos (5s), erros nunca vazam stack para cliente, `connections.status` refleti `error` com mensagem generica.
- QR expira: polling detecta e UI mostra botao "Gerar novo QR".
- Chave Evolution no bundle: JAMAIS. So server functions/edge functions leem `process.env`.
- PII em logs: mensagens/telefones nunca em console.log; apenas ids opacos.
- Rate-limit: server functions com debounce basico (nao criar 2 conexoes com mesmo nome).

## Dependencias
- F1 done/partial (schema `connections`, `messages`, `contacts`, `webhook_events` ja existem).
- [VERIFY] `EVOLUTION_BASE_URL` (URL publica do Evolution API do usuario).
- [VERIFY] `EVOLUTION_API_KEY` (global api key do Evolution do usuario).
- [VERIFY] URL publica preview estavel para configurar no Evolution como webhook.

## Acceptance criteria
- AC1: `ChannelProvider` contrato existe e `EvolutionProvider` implementa 100% dos metodos.
- AC2: `/conexoes` lista conexoes do workspace default, mostra status com badge HUD.
- AC3: Criar nova conexao gera QR real do Evolution, exibido em <5s, com polling de status.
- AC4: Ao escanear QR (manual), status muda para `connected` sem reload; badge atualiza.
- AC5: Webhook `/api/public/evolution/webhook` aceita POST valido (token correto) -> 200 + persiste em `webhook_events` e `messages`. Token invalido -> 401, sem persistir, sem vazar PII em resposta.
- AC6: Desconectar remove instancia no Evolution e apaga linha local; UI atualiza.
- AC7: Nenhuma chave Evolution aparece no bundle client (`grep -r EVOLUTION_API_KEY dist/` vazio).
- AC8: `supabase--linter` limpo apos a feature.