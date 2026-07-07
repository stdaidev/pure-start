import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/conexoes")({
  head: () => ({
    meta: [
      { title: "Conexoes // HUD" },
      { name: "description", content: "Instancias WhatsApp via Evolution API." },
    ],
  }),
  component: () => <Placeholder title="Conexoes" feature="F2" />,
});