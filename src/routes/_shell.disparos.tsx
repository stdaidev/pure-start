import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/disparos")({
  head: () => ({
    meta: [
      { title: "Disparos // HUD" },
      { name: "description", content: "Campanhas com anti-ban e monitor." },
    ],
  }),
  component: () => <Placeholder title="Disparos" feature="F6" />,
});