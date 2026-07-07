import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configuracoes // HUD" },
      { name: "description", content: "Secrets, provedores e ajustes gerais." },
    ],
  }),
  component: () => <Placeholder title="Configuracoes" feature="F7" />,
});