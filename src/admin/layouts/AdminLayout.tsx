import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Award, BarChart3, Bell, CalendarRange, Crown, History, LayoutGrid, LogOut, Megaphone, ScanLine, ShoppingBag, ScrollText, Trophy, UserCog, Users } from "lucide-react";
import { useEffect } from "react";
import { tokenStore } from "@/shared/api";
import { useToken } from "@/shared/useToken";
import { ThemeToggle } from "@/shared/ThemeToggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarRange },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
  { to: "/admin/gate", label: "Gate check-in", icon: ScanLine },
  { to: "/admin/vip", label: "VIP passes", icon: Crown },
  { to: "/admin/checkins", label: "Check-in history", icon: History },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/content", label: "Website content", icon: Megaphone },
  { to: "/admin/team", label: "Judges & volunteers", icon: UserCog },
  { to: "/admin/rewards", label: "Rewards & awards", icon: Award },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/merch", label: "Merchandise", icon: ShoppingBag },
  { to: "/admin/audit", label: "Audit logs", icon: ScrollText },
] as const;

export function AdminLayout() {
  const nav = useNavigate();
  const { ready, token } = useToken("admin");
  useEffect(() => { if (ready && !token) nav({ to: "/admin/login" }); }, [ready, token, nav]);
  if (!ready || !token) return <div className="min-h-screen bg-background" />;
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BarChart3 className="h-5 w-5" /></div>
          <div><p className="font-display font-bold leading-none">Upgrade Talents India</p><p className="text-xs text-muted-foreground">Operations</p></div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: I, ...r }) => (
            <Link key={to} to={to} activeOptions={{ exact: "exact" in r }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-semibold text-sidebar-primary" }}>
              <I className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mb-2"><ThemeToggle /></div>
        <Button variant="ghost" onClick={() => { tokenStore.clear("admin"); nav({ to: "/admin/login" }); }} className="justify-start gap-3 text-muted-foreground">
          <LogOut className="h-4 w-4" />Sign out
        </Button>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-2 md:hidden"><ThemeToggle compact /><Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => { tokenStore.clear("admin"); nav({ to: "/admin/login" }); }}><LogOut /></Button></div>
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-card p-3 md:hidden">
          {NAV.map(({ to, label }) => <Link key={to} to={to} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm" activeProps={{ className: "bg-accent font-semibold" }}>{label}</Link>)}
        </div>
        <main className="mx-auto max-w-7xl p-6 lg:p-10"><Outlet /></main>
      </div>
    </div>
  );
}
