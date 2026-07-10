import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Plug,
  Bot,
  MessagesSquare,
  Users,
  Table2,
  Send,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Conexoes", url: "/conexoes", icon: Plug },
  { title: "Agentes", url: "/agentes", icon: Bot },
  { title: "Conversas", url: "/conversas", icon: MessagesSquare },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Planilhas", url: "/planilhas", icon: Table2 },
  { title: "Disparos", url: "/disparos", icon: Send },
  { title: "Configuracoes", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
            style={{ boxShadow: "0 0 12px oklch(0.72 0.19 48 / 0.7)" }}
          />
          {!collapsed && (
            <span
              className="text-sm font-semibold tracking-[0.2em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              LDK//HUD
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Modulos
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        {!collapsed && (
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            v0.1 // ready
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
