# F6.2 - Cooldown por lead - Brief

## Problema
Hoje o stop-on-reply so bloqueia envios em campanhas ja `running` no instante em que uma resposta chega. Se um lead
respondeu ontem e amanha entra em outra campanha, o sistema envia normalmente — risco de queimar reputacao e ma
experiencia do lead.

## Objetivo
Nao enviar para telefones que tiveram contato inbound recente. Aplicar bloqueio duro global no momento do envio e
dar ao operador uma flag opcional por campanha para escolher a janela (horas ou dias).

## Regras
- Bloqueio duro (default global): se `messages` tem inbound do mesmo telefone dentro da janela padrao do workspace
  (ex: 24h), o recipient nasce/vira `stopped_recent_reply` e nunca sai.
- Flag opcional por campanha: operador pode desligar o cooldown ou ampliar a janela (`cooldown_value` +
  `cooldown_unit ∈ {hours,days}`). Nunca pode reduzir abaixo da janela padrao do workspace.
- Aplicado em dois pontos: (a) `createCampaign` filtra a lista antes de inserir recipients; (b) worker re-checa antes
  de mandar (defesa em profundidade caso a resposta chegue depois do create).
- Novo status de recipient: `stopped_recent_reply` (badge cinza, texto "cooldown").

## Nao-objetivos
- Nao mexer em opt-out global (`contacts.opt_out`).
- Nao reagenda automatico apos janela expirar; recipient bloqueado fica bloqueado nessa campanha.

## Risco
medio. Toca create de campanha (F6) e worker (F6.1). Nao mexe em auth/RLS/pagamento.

## Proof
P2. Fluxo manual: criar campanha com telefone que tem inbound recente -> deve virar `stopped_recent_reply`;
desligar flag na campanha -> envia normalmente; ajustar unidade horas/dias funciona.

## Dependencias
F4 (webhook grava inbound em `messages`), F6/F6.1 (create + worker).

## Fora de escopo
Timeline de leads, "ultimo contato" na tela de contatos, reenvio automatico depois do cooldown.