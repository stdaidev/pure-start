# F5 - Contatos e Planilhas - Brief

## Objetivo
Importar listas de contatos via CSV/XLSX, mapear colunas para campos padrao
(`name`, `phone`, `email`, `tags`) + placeholders livres, e manter base
pesquisavel com opt-out. Base usada por F6 (Disparos) e visivel em F4.

## Usuario
Operador que hoje mantem contatos em planilha e precisa importar para o WhatsApp.

## Resultado
- `/contatos`: lista pesquisavel, edicao inline de nome/tags, toggle opt-out, botao "Importar planilha".
- `/planilhas`: wizard 3 passos - upload -> mapear colunas -> preview. Aceita `.csv` e `.xlsx`.
- Import faz upsert por `(workspace_id, phone)`; nao apaga historico nem reverte opt-out existente.
- Colunas nao mapeadas viram chaves em `contacts.metadata` (placeholders para F6).

## Fora de escopo
- Segmentos/listas nomeadas.
- Sync com CRM externo, enrichment/validacao paga.
- Auditoria completa de imports (so registra contagem).

## Riscos
- medio: PII em massa (telefone/nome/email).
- Parsing XLSX no Worker exige lib edge-safe - decidido fazer parse no client (SheetJS) para nao expor o arquivo cru ao server.
