# LDK Task Ledger

| ID | Feature | Risk | State | Proof required | Last evidence |
|----|---------|------|-------|----------------|---------------|
| F0 | Design system dark terminal/HUD (tokens OKLCH, fontes Space Grotesk/JetBrains Mono/Inter, glass cards, brackets, grid sutil, sem animacao sobre texto) | baixo | done | P1 | ldk/features/f0-design-system/proof.md |
| F1 | Base: schema Postgres + secrets + layout com sidebar | alto | partial | P3 | ldk/features/f1-base/proof.md |
| F2 | Contratos modulares + EvolutionProvider + modulo Conexoes (QR/status/webhook) | alto | done | P4 | ldk/features/f2-conexoes/proof.md |
| F3 | Runtime do agente (webhook -> buffer -> LLM -> saida humanizada) + modulo Agentes | alto | partial | P4 | ldk/features/f3-runtime-agente/proof.md |
| F4 | Conversas/inbox + handoff (assumir/devolver IA) | medio | done | P2 | ldk/features/f4-conversas-handoff/proof.md |
| F5 | Contatos e Planilhas (upload CSV/XLSX, headers->placeholders, opt-out) | medio | done | P2 | ldk/features/f5-contatos-planilhas/proof.md |
| F6 | Disparos (wizard, template com preview, anti-ban, worker pg_cron, monitor ao vivo) | alto | partial | P4 | ldk/features/f6-disparos/proof.md |
| F6.1 | Anti-ban hardening + multi-instancia (next_send_at escalonado, hourly cap, kill-switch global, stop-on-reply, round-robin de conexoes) | alto | partial | P4 | ldk/features/f6.1-anti-ban-hardening/proof.md |
| F6.2 | Cooldown por lead: nao enviar para telefone que ja teve contato inbound recente. Bloqueio duro no create/tick + flag opcional por campanha "ignorar quem contactou nos ultimos X" com unidade selecionavel (horas/dias) | medio | approved | P2 | |
| F7 | Dashboard + Configuracoes + polimento | baixo | idea | P1 | |
