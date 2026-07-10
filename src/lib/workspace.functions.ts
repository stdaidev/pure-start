import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * F6.1 T2 - Kill-switch de workspace e leitura de flags.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export const getWorkspaceFlags = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id, name, dispatch_paused, cooldown_default_hours")
    .eq("id", DEFAULT_WORKSPACE)
    .maybeSingle();
  if (error) throw new Error("Falha ao carregar workspace");
  return {
    id: data?.id ?? DEFAULT_WORKSPACE,
    name: data?.name ?? "workspace",
    dispatch_paused: data?.dispatch_paused ?? false,
    cooldown_default_hours:
      (data as { cooldown_default_hours?: number } | null)?.cooldown_default_hours ?? 24,
  };
});

export const updateWorkspaceKillSwitch = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ dispatch_paused: z.boolean() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ dispatch_paused: data.dispatch_paused })
      .eq("id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar kill-switch");
    return { ok: true, dispatch_paused: data.dispatch_paused };
  });

export const updateWorkspaceCooldown = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        value: z.number().int().min(0).max(720),
        unit: z.enum(["hours", "days"]),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const hours = data.unit === "days" ? data.value * 24 : data.value;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ cooldown_default_hours: hours } as never)
      .eq("id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar cooldown padrao");
    return { ok: true, cooldown_default_hours: hours };
  });
