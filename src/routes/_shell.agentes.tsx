import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes // HUD" },
      { name: "description", content: "Configuracao dos agentes de IA." },
    ],
  }),
  component: () => <Placeholder title="Agentes" feature="F3" />,
});