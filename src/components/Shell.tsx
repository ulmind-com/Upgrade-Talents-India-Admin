"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid, Users, CalendarDays, Ticket, Trophy, Gavel, GraduationCap, Presentation,
  Crown, ShoppingBag, Award, BadgeCheck, Gift, Bell, Globe, FileClock, Settings,
  LogOut, Menu, X, Sun, Moon, Search, ExternalLink, ScanLine, HandHeart, ShieldCheck,
  Sparkles, Mail, Bell as BellIcon,
} from "lucide-react";
import { useAdmin, useTheme } from "./Providers";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; Icon: any; badge?: string };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Menu",
    items: [{ href: "/", label: "Dashboard", Icon: LayoutGrid }],
  },
  {
    group: "Events",
    items: [
      { href: "/events", label: "Events", Icon: CalendarDays },
      { href: "/tickets", label: "Tickets", Icon: Ticket },
      { href: "/check-in", label: "Gate Check-in", Icon: ScanLine },
      { href: "/vip", label: "VIP Passes", Icon: Crown },
    ],
  },
  {
    group: "Competitions",
    items: [
      { href: "/competitions", label: "Competitions", Icon: Trophy },
      { href: "/judges", label: "Judges", Icon: Gavel },
      { href: "/volunteers", label: "Volunteers", Icon: HandHeart },
      { href: "/certificates", label: "Certificates", Icon: Award },
      { href: "/badges", label: "Badges", Icon: BadgeCheck },
    ],
  },
  {
    group: "Learning",
    items: [
      { href: "/courses", label: "Courses", Icon: GraduationCap },
      { href: "/workshops", label: "Workshops", Icon: Presentation },
    ],
  },
  {
    group: "Commerce",
    items: [
      { href: "/merchandise", label: "Merchandise", Icon: ShoppingBag },
      { href: "/rewards", label: "Rewards & Referrals", Icon: Gift },
    ],
  },
  {
    group: "General",
    items: [
      { href: "/users", label: "Users", Icon: Users },
      { href: "/notifications", label: "Notifications", Icon: Bell },
      { href: "/website", label: "Website Content", Icon: Globe },
      { href: "/audit", label: "Audit Log", Icon: FileClock },
      { href: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

const SUBTITLES: Record<string, string> = {
  "/": "Plan, publish and track everything in one place.",
  "/events": "Create events and control what appears on the public site.",
  "/tickets": "Price, stock and sale windows for every ticket tier.",
  "/check-in": "Verify passes at the gate and admit holders.",
  "/vip": "Issue, track and revoke VIP access.",
  "/competitions": "Run judging, voting and result publishing.",
  "/judges": "Invite judges and manage their panel access.",
  "/volunteers": "Gate staff who scan passes during events.",
  "/certificates": "Issued certificates and their verification links.",
  "/badges": "Automatic achievements earned across the platform.",
  "/courses": "Masterclasses published to the website.",
  "/workshops": "Short-form workshops and bootcamps.",
  "/merchandise": "Products, orders and stock levels.",
  "/rewards": "Referral rules, coin ledger and expiry.",
  "/users": "Everyone registered on the website or app.",
  "/notifications": "Draft, schedule and send announcements.",
  "/website": "Every section of the public site, no developer needed.",
  "/audit": "A record of every admin action.",
  "/settings": "Voting power and environment details.",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, logout } = useAdmin();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [loading, admin, router]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="skeleton size-12 rounded-full" role="status" aria-label="Loading" />
      </div>
    );
  }
  if (!admin) return null;

  const current = ALL_ITEMS.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)));
  const matches = q.trim()
    ? ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  const sidebar = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5 hide-scrollbar">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand)]">
          <ShieldCheck className="size-5 text-white" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-bold leading-tight">Upgrade Talents</span>
          <span className="block text-[10.5px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">Control Room</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fg-subtle)]">{group.group}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors",
                        active ? "font-semibold text-[var(--brand)]" : "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-bar"
                          className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <item.Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="brand-surface relative overflow-hidden rounded-2xl p-4">
        <span className="grid size-8 place-items-center rounded-full bg-white/15">
          <Sparkles className="size-4 text-white" aria-hidden />
        </span>
        <p className="mt-3 text-[14px] font-bold leading-snug text-white">View the live site</p>
        <p className="mt-1 text-[11.5px] leading-snug text-white/70">See what visitors see right now</p>
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-xl bg-white/15 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/25"
        >
          Open site <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );

  return (
    <div className="page-shell min-h-dvh lg:p-4">
      <div className="app-frame flex h-dvh overflow-hidden bg-[var(--bg)] lg:h-[calc(100dvh-2rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-[252px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[120] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[var(--scrim)]" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 w-[270px] bg-[var(--surface)]"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 z-10 grid size-10 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] hover:bg-[var(--surface-2)]"
              >
                <X className="size-4" aria-hidden />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-[80] border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 md:px-7">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:hidden"
            >
              <Menu className="size-4" aria-hidden />
            </button>

            {/* Quick nav search */}
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
              <label htmlFor="admin-jump" className="sr-only">Search sections</label>
              <input
                id="admin-jump"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search section…"
                className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-16 text-[13px] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--brand)] focus:bg-[var(--surface)]"
              />
              <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-subtle)] sm:block">
                ⌘F
              </kbd>
              {matches.length > 0 && (
                <ul className="absolute inset-x-0 top-13 z-50 mt-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]">
                  {matches.map((m) => (
                    <li key={m.href}>
                      <Link
                        href={m.href}
                        onClick={() => setQ("")}
                        className="flex min-h-[44px] items-center gap-3 px-4 text-[13px] transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <m.Icon className="size-4 shrink-0 text-[var(--fg-muted)]" aria-hidden /> {m.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {[
                { Icon: Mail, label: "Messages", href: "/notifications" },
                { Icon: BellIcon, label: "Notifications", href: "/notifications" },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  aria-label={a.label}
                  className="hidden size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] sm:grid"
                >
                  <a.Icon className="size-[18px]" aria-hidden />
                </Link>
              ))}

              <button
                onClick={toggle}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                className="grid size-11 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
              >
                {theme === "light" ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
              </button>

              <div className="hidden items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-1.5 pr-4 md:flex">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand)]">
                  {String(admin?.email || "A").slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block max-w-[150px] truncate text-[12.5px] font-bold">
                    {String(admin?.email || "Admin").split("@")[0]}
                  </span>
                  <span className="block max-w-[150px] truncate text-[10.5px] text-[var(--fg-subtle)]">{admin?.email}</span>
                </span>
              </div>

              <button
                onClick={logout}
                aria-label="Sign out"
                className="grid size-11 cursor-pointer place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:text-[var(--danger)]"
              >
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 overflow-y-auto px-4 py-6 md:px-7 md:py-8">
          {current && (
            <div className="mb-6">
              <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-bold leading-tight">{current.label}</h1>
              <p className="mt-1 text-[13.5px] text-[var(--fg-muted)]">{SUBTITLES[current.href] || "Manage this section of the platform."}</p>
            </div>
          )}
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
