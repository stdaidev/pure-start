# LDK Task Ledger

| ID | Feature | Risk | State | Proof required | Last evidence |
|----|---------|------|-------|----------------|---------------|
| F0 | Design system dark terminal/HUD (tokens OKLCH, fontes Space Grotesk/JetBrains Mono/Inter, glass cards, brackets, grid sutil, sem animacao sobre texto) | baixo | done | P1 | ldk/features/f0-design-system/proof.md |
| F1 | Base: schema Postgres + secrets + layout com sidebar | alto | done | P3 | ldk/features/f7-dashboard-config/proof.md |
| F2 | Contratos modulares + EvolutionProvider + modulo Conexoes (QR/status/webhook) | alto | done | P4 | ldk/features/f2-conexoes/proof.md |
| F3 | Runtime do agente (webhook -> buffer -> LLM -> saida humanizada) + modulo Agentes | alto | partial | P4 | ldk/features/f3-runtime-agente/proof.md |
| F4 | Conversas/inbox + handoff (assumir/devolver IA) | medio | done | P2 | ldk/features/f4-conversas-handoff/proof.md |
| F5 | Contatos e Planilhas (upload CSV/XLSX, headers->placeholders, opt-out) | medio | done | P2 | ldk/features/f5-contatos-planilhas/proof.md |
| F6 | Disparos (wizard, template com preview, anti-ban, worker pg_cron, monitor ao vivo) | alto | done | P4 | ldk/features/f6-disparos/proof.md |
| F6.1 | Anti-ban hardening + multi-instancia (next_send_at escalonado, hourly cap, kill-switch global, stop-on-reply, round-robin de conexoes) | alto | done | P4 | ldk/features/f6.1-anti-ban-hardening/proof.md |
| F6.2 | Cooldown por lead: nao enviar para telefone que ja teve contato inbound recente. Bloqueio duro no create/tick + flag opcional por campanha "ignorar quem contactou nos ultimos X" com unidade selecionavel (horas/dias) | medio | done | P2 | ldk/features/f6.2-cooldown-lead/proof.md |
| F7 | Dashboard + Configuracoes (secrets/provedores) + polimento (esconde "Disparar agora" em prod) | baixo | done | P2 | ldk/features/f7-dashboard-config/proof.md |
| F8 | Debounce persistente por conversa + run lock no runtime (evita respostas duplicadas em rajadas) | medio | partial | P2 | ldk/features/f8-debounce-lock/proof.md |
| F9 | Blocklist de numeros que o agente nao atende (amigos/funcionarios): mensagem entra na inbox mas nao dispara o agente | baixo | done | P2 | ldk/features/f9-agent-blocklist/proof.md |
| Fhot | Hotfix bundle: dashboard inbound/outbound, agent.tick sem race (lock ate runtime terminar), default_max_tool_rounds=2 | medio | done | P2 | ldk/features/fhot-hotfix/proof.md |
| Fabc | Anti-ban por conexao: cota hourly/daily GLOBAL por WhatsApp, gate no worker antes de enviar | alto | done | P2 | ldk/features/fabc-antiban-conexao/proof.md |
| F10 | CRM leve na conversa: tags, valor do lead, nota, outcome (ganho/perdido), filtro por tag, contexto para IA no system prompt | medio | done | P2 | ldk/features/f10-crm-leve/proof.md |
| F11 | KPIs pipeline leve: valor em aberto, valor ganho, top tags no dashboard | baixo | done | P1 | ldk/features/f11-pipeline-kpis/proof.md |
| F12 | Tools do agente com aprovacao: sugerir_tags_conversa, sugerir_valor_lead, fila require_approval | alto | planned | P4 | |
