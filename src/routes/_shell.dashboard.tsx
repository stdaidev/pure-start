import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard // HUD" },
      { name: "description", content: "Painel operacional do agente WhatsApp." },
    ],
  }),
  component: () => <Placeholder title="Dashboard" feature="F7" />,
});