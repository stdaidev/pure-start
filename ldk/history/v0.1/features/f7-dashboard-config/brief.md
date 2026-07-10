# F7 - Dashboard + Configuracoes (secrets/provedores) + polimento

## Objetivo
Fechar os dois placeholders que sobraram no shell (Dashboard) e completar a
tela de Configuracoes com cadastro dos secrets de provedor. Como efeito
colateral, promove F1 (base) de `partial` para `done` — o AC3 pendente era
justamente "UI de configuracao dos secrets".

## Usuario / caso de uso
- Operador abre `/dashboard` e ve num relance: quantas conexoes connected,
  quantas campanhas rodando, mensagens hoje (in/out), respostas hoje,
  ultimas 5 campanhas com progresso.
- Operador vai em `/configuracoes` e cadastra/atualiza:
  - Evolution API base URL + API key
  - OpenAI API key (agentes)
  - ElevenLabs API key (opcional)
  Cada campo com mascara + indicador "configurado/faltando".
- No release publicado, o botao "Disparar agora" em `/disparos/$id`
  desaparece (fica so em `import.meta.env.DEV`).

## Escopo
- `/dashboard`: query agregada readonly + cards KPI + lista das 5 ultimas
  campanhas com progresso.
- `/configuracoes`: nova secao "Provedores" abaixo de kill-switch/cooldown.
  Server fn para ler status (`configured: bool`, `masked: string`) e para
  gravar valor. Nunca retorna valor bruto ao client.
- Polimento: esconder "Disparar agora" atras de `import.meta.env.DEV`.

## Fora de escopo
- Auth/login.
- Multi-workspace.
- Historico de mudancas de secrets.
- Grafico temporal.
- Teste real de conexao Evolution/OpenAI (fica [VERIFY] no plan).

## Risco
baixo/medio: secrets em transito/armazenamento sao dado sensivel; leitura e
gravacao SOMENTE via server fn, nunca expor valor bruto no client.

## Proof required
P2 (fluxo manual: cadastrar cada secret, ver mascara, reload nao perde
valor; dashboard reflete numeros apos criar/enviar campanha).

## Dependencias
- F0 done, F1 partial (F7 fecha AC3), F6/F6.1/F6.2 done.

## Efeito colateral esperado no ledger
- F7 -> done (P2).
- F1 -> done (evidencia adicional de secrets funcionando via F7).
