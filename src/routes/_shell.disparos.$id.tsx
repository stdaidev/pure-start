import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/disparos/$id")({
  head: () => ({
    meta: [
      { title: "Campanha // Disparos" },
      { name: "description", content: "Monitor da campanha em tempo real." },
    ],
  }),
  component: () => <Placeholder title="Monitor de campanha" feature="F6 T7" />,
});