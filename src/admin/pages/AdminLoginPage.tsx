import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { extractToken, tokenStore } from "@/shared/api";
import { adminApi } from "../api";
import { btnCls, fieldCls } from "../components/ui";
import { ThemeToggle } from "@/shared/ThemeToggle";
import { Button } from "@/components/ui/button";

export function AdminLoginPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const t = extractToken(await adminApi.login(String(f.get("email")), String(f.get("password"))));
      if (!t) throw new Error("No token returned");
      tokenStore.set("admin", t);
      nav({ to: "/admin" });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="absolute right-6 top-6"><ThemeToggle compact /></div>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-8 shadow-glow">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck /></div>
        <div><h1 className="font-display text-2xl font-bold">Upgrade Talents India Admin</h1><p className="text-sm text-muted-foreground">Staff & administrators only</p></div>
        <input name="email" type="email" required placeholder="Admin email" className={fieldCls} />
        <input name="password" type="password" required placeholder="Password" className={fieldCls} />
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </div>
  );
}
