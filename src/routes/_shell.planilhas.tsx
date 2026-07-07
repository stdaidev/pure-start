import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/hud-placeholder";

export const Route = createFileRoute("/_shell/planilhas")({
  head: () => ({
    meta: [
      { title: "Planilhas // HUD" },
      { name: "description", content: "Upload de CSV/XLSX e headers." },
    ],
  }),
  component: () => <Placeholder title="Planilhas" feature="F5" />,
});