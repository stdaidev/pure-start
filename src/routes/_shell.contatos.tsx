import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos // HUD" },
      { name: "description", content: "Base de contatos e opt-out." },
    ],
  }),
  component: () => <Placeholder title="Contatos" feature="F5" />,
});