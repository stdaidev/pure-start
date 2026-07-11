# Feature Brief - F3 Agent observability

Status: planned
Risk: medio
Proof required: P2
Discovery revision: 1

## Objetivo

Registrar um rastro estruturado por run do agente para diferenciar sucesso, skip e falha sem armazenar mensagem,
prompt, telefone ou argumentos sensiveis.

## Usuario

Operador e mantenedor que diagnosticam automacoes assincronas.

## Escopo

- Tabela `agent_run_logs` server-only/isolada.
- Status, reason/error code, modelo, contadores, tempos e tools sanitizadas.
- Um registro por run, incluindo skips e falhas.
- Indices para consulta por workspace/conversa/tempo.

## Fora de escopo

- Dashboard visual, retencao automatica e memoria de conversa.

## Acceptance criteria

- AC1: Tabela, grants, RLS e indices seguem o acesso decidido.
- AC2: Cada run grava status, timestamps e duracao.
- AC3: Usage e error code sao registrados quando disponiveis.
- AC4: Tools guardam apenas nome/status.
- AC5: Nenhum campo ou log contem telefone, conteudo, prompt, resposta ou args.
- AC6: Dois runs controlados produzem registros consultaveis e sanitizados.

## Dependencias

- F1 e F2 done.

## Preocupacoes aplicaveis

- PII, retencao, volume de logs, grants, observabilidade e custo de escrita.

## Pendencias [VERIFY]

- [ ] Definir retencao antes de aumentar volume/uso.
