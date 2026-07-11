# Revisao de seguranca - 2026-07-10

## Corrigido nesta revisao

- Ownership persistente por token nos runs do agente e revalidacao antes de efeitos externos.
- Autenticacao server-only dos ticks; chave publica do Supabase deixou de ser aceita.
- Blocklist, handoff, agente/conexao ativos e mensagem mais recente revalidados durante o run.
- Timeout, retry limitado e erros sanitizados do OpenAI; argumentos de tools validados sem excecao bruta.
- Revalidacao de campanha, kill-switch, recipient e conexao imediatamente antes do disparo.
- Liberacao da reserva de conexao em caminhos de erro/skip conhecidos.
- Webhook com limite de payload, token apenas em header e payload de auditoria sanitizado.
- Respostas/logs do Evolution deixaram de incluir corpo potencialmente sensivel.
- Escopo de workspace e verificacao de erro nas operacoes de conexao.
- Campanha valida conexoes antes da criacao e remove estado parcial se destinatarios/vinculos falharem.
- Cotas horaria, diaria e de warm-up da campanha usam reserva atomica com compensacao em falha/skip.

## Bloqueios antes de exposicao publica

1. **Critico - autenticacao/autorizacao do painel:** nao ha login nem ownership de usuario dentro do app. O operador
   aceitou o login de acesso do Lovable como protecao temporaria; implementar auth e policies antes de publicar fora
   desse gate.
2. **Alto - secrets em texto plano:** `workspace_secrets` depende da protecao do banco/service role. Planejar cofre ou
   criptografia com chave fora do banco antes de escalar operadores.
3. **Alto - prova integrada:** migrations e concorrencia precisam de teste contra um Supabase de staging; testes
   unitarios nao demonstram semantica real de `FOR UPDATE SKIP LOCKED`.
4. **Medio - LGPD:** definir retencao, exportacao e exclusao de contatos, mensagens e payloads historicos.

Esta lista e um gate operacional, nao uma declaracao de conformidade.
