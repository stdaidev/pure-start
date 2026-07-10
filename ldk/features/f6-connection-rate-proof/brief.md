# Feature Brief - F6 Connection rate proof

Status: planned
Risk: alto
Proof required: P4
Discovery revision: 1

## Objetivo

Provar que os limites globais por conexao permanecem atomicos quando duas campanhas disputam o mesmo slot.

## Usuario

Operador cuja reputacao do numero depende de limites consistentes.

## Escopo

- Auditar a RPC `try_reserve_connection_slot` e grants atuais.
- Executar stress test controlado com concorrencia real ou fixture equivalente.
- Confirmar que limite cheio reagenda sem ultrapassar hourly/daily cap.
- Registrar CI/diff e checklist de seguranca.

## Fora de escopo

- Novo algoritmo anti-ban, nova UI ou aumento de limites.

## Acceptance criteria

- AC1: Reservas concorrentes nunca excedem o cap da conexao.
- AC2: Reserva rejeitada nao incrementa contadores nem envia mensagem.
- AC3: Falha/rollback libera ou compensa slot conforme contrato atual.
- AC4: Somente service role executa RPCs privilegiadas.
- AC5: Stress test, build, lint e CI passam com referencias atuais.

## Dependencias

- Baseline da antiga Fabc em `ldk/history/v0.1/` e migrations atuais.

## Preocupacoes aplicaveis

- Concorrencia, reputacao/abuso, transacao, grants e efeito externo.

## Pendencias [VERIFY]

- [ ] Escolher ambiente/fixture que nao produza disparo real.
