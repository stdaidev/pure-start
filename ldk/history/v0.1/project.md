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

## Design system (F0)
- Estetica: terminal/HUD premium, dark-first (app abre no dark), monocromatico + acento laranja neon.
- Base: shadcn/ui new-york + lucide + tokens OKLCH em src/styles.css.
- Tipografia (Google Fonts via <link> no __root.tsx):
  - Space Grotesk: titulos e numeros grandes (escala fluida com clamp()).
  - JetBrains Mono: labels, metricas, IDs, timestamps, codigos.
  - Inter: corpo e UI.
- Paleta principal (dark) e .light opcional: ver bloco :root/.light acordado no intake. --primary laranja neon oklch(0.72 0.19 48), background quase-preto oklch(0.15 0 0), border = laranja translucido.
- Tratamentos permitidos (curados, estaticos/sutis):
  - Glass cards (backdrop-filter blur(10px), borda laranja translucida, rounded-2xl, hover com leve glow externo + 2px de elevacao).
  - Cantos em L (UI brackets) como pseudo-elementos, 100% estaticos.
  - Grid de fundo sutil (linhas laranja 4-6% opacidade, 60x60px, estatico).
  - Glow discreto e fixo em botoes/icones primarios (sem pulsar).
  - Ruido opcional (SVG turbulence ~3%, mix-blend-mode overlay).
  - Fade-up de secao uma unica vez ao carregar (opcional, sem loops).
- Selection em laranja translucido.
- PROIBIDO: flicker, shimmer varrendo texto, blink, scanline, marquee, orbit, qualquer animacao sobre letras. Unica excecao permitida: pulse lento apenas no dot de status "online".

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
