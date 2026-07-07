import { createFileRoute, redirect } from "@tanstack/react-router";

// A home aponta direto para o dashboard dentro do shell HUD.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});