import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas // HUD" },
      { name: "description", content: "Inbox e handoff das conversas." },
    ],
  }),
  component: () => <Placeholder title="Conversas" feature="F4" />,
});