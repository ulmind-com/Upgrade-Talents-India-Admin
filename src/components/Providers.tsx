"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { authApi, adminToken } from "@/lib/api";

/* ───────── THEME ───────── */
type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    let t: Theme = "light";
    try { const s = localStorage.getItem("uti_admin_theme"); if (s === "dark" || s === "light") t = s; } catch {}
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  const toggle = useCallback(() => {
    setTheme((p) => {
      const n: Theme = p === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", n);
      try { localStorage.setItem("uti_admin_theme", n); } catch {}
      return n;
    });
  }, []);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

/* ───────── TOASTS ───────── */
type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
const ToastCtx = createContext<{ push: (tone: Toast["tone"], message: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, tone, message }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = {
    success: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
    error: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "border-[var(--info)] bg-[var(--info-soft)] text-[var(--info)]",
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-full max-w-sm flex-col gap-2.5">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                role={t.tone === "error" ? "alert" : undefined}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-[var(--shadow-pop)] ${tones[t.tone]}`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}
                  aria-label="Dismiss notification"
                  className="cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ───────── AUTH ───────── */
type AuthState = { admin: any | null; loading: boolean; refresh: () => Promise<void>; logout: () => void };
const AuthCtx = createContext<AuthState>({ admin: null, loading: true, refresh: async () => {}, logout: () => {} });
export const useAdmin = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!adminToken.get()) { setAdmin(null); setLoading(false); return; }
    try { setAdmin(await authApi.me()); }
    catch { adminToken.clear(); setAdmin(null); }
    finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    adminToken.clear();
    setAdmin(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <AuthCtx.Provider value={{ admin, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}
