# Project - Substituto do n8n (Atendimento + Disparo WhatsApp)

## Produto
- Nome: (a definir - workspace default)
- Objetivo: substituir fluxos n8n em duas frentes: (1) agente de IA humanizado no WhatsApp e (2) disparo de campanhas a partir de planilha.
- Usuario principal: operador unico na v1 (sem login), com backend preparado para multiusuario depois.
- Resultado esperado: configurar agente e campanhas por formularios declarativos, sem codigo, com anti-ban e humanizacao.

## Plataforma
- Frontend: React + TypeScript + Tailwind + shadcn/ui (sidebar fixa, tema claro/escuro, PT-BR).
- Backend: Supabase (Postgres + Edge Functions Deno/TS + pg_cron + Storage + Secrets). [VERIFY] habilitar Lovable Cloud.
- Provedor WhatsApp inicial: Evolution API 2.3.7 (nao oficial), atras de contrato ChannelProvider.
- LLM inicial: OpenAI via LLMProvider. Transcricao: Whisper. TTS: ElevenLabs (eleven_multilingual_v2).
- Sem login v1. Coluna workspace_id em todas as tabelas com default fixo.

## Fonte da verdade
- Contexto: ldk/project.md
- Ledger: ldk/ledger.md
- Roadmap: ldk/roadmap.md
- Features: ldk/features/
- Provas: ldk/features/*/proof.md

## Riscos
- Dados pessoais: telefones e conteudo de conversas (LGPD). Alto.
- Pagamentos: fora de escopo v1.
- Permissoes/admin: sem login v1; RLS ligado com policies do workspace default.
- Integracoes externas: Evolution (API nao oficial - risco de ban), OpenAI, ElevenLabs. Alto.
- Supabase/RLS: obrigatorio em todas as tabelas.
- Compliance: anti-ban (warm-up, janela horaria, intervalo aleatorio, opt-out, kill-switch).

## MVP (criterios de aceite v1 do spec)
1. Parear instancia Evolution via QR com status ao vivo.
2. Criar agente com prompt em blocos + tools declarativas + humanizacao.
3. /resetar, tool transferir humano, assumir/devolver pela inbox.
4. Upload planilha, headers->placeholders, template com preview real.
5. Campanha com anti-ban (intervalo, teto, janela, warm-up, distribuicao) + monitor ao vivo.
6. Nenhuma chave no navegador; worker por pg_cron.
7. Novo provider/tool = so implementar contrato.

## Fora de escopo v1
- Login/auth real (estrutura preparada).
- Pagamentos.
- API oficial WhatsApp Business.
- Multi-workspace real.

## Regras
- Nenhum segredo no bundle/frontend/log. Toda chamada externa em Edge Function.
- Webhook publico protegido por WEBHOOK_VERIFY_TOKEN.
- Contratos modulares em supabase/functions/_shared/providers/.
- Registry de tools plugavel.
- Idempotencia por message.id, retry com backoff.
- Todas as tabelas: id uuid, workspace_id, created_at, updated_at, RLS.

## Auditoria LDK
- Audit log: on
- Audit log file: ldk/audit/log.md

## Pendencias [VERIFY]
- [VERIFY] Habilitar Lovable Cloud (Supabase).
- [VERIFY] Secrets: EVOLUTION_BASE_URL, EVOLUTION_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY, WEBHOOK_VERIFY_TOKEN.
- [VERIFY] URL publica estavel para webhook Evolution.
- [VERIFY] Numero WhatsApp de teste.
- [VERIFY] voice_id ElevenLabs default.
- [VERIFY] Modelo OpenAI default.
