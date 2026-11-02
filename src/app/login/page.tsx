"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { authApi, adminToken } from "@/lib/api";
import { useAdmin } from "@/components/Providers";

export default function AdminLogin() {
  const router = useRouter();
  const { admin, loading, refresh } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && admin) router.replace("/");
  }, [loading, admin, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errs: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await authApi.login(email.trim(), password);
      adminToken.set(res.access_token);
      await refresh();
      router.replace("/");
    } catch (err: any) {
      setFormError(err?.message || "Sign-in failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#070a12] via-[#0b101e] to-[#05070d] p-4 sm:p-6 md:p-8 lg:p-12 overflow-hidden selection:bg-[#fca34d]/30 selection:text-white">
      {/* Cinematic Dance Stage Ambient Lighting & Spotlights */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-1/4 size-[480px] rounded-full bg-amber-500/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-10 size-[520px] rounded-full bg-violet-600/15 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-sky-500/10 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.03)_0%,transparent_70%)]"
      />

      {/* Main Floating Dance Competition Admin Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1024px] rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.65)] border border-white/15 bg-[#0b101e]"
      >
        {/* Card Background: Dance Stage Performance Art + Organic White Scoop */}
        <div
          className="relative w-full bg-no-repeat bg-cover bg-center"
          style={{
            backgroundImage: "url('/admin-dance-card.webp'), url('/admin-dance-card.jpg'), url('/admin-login-art.png')",
          }}
        >
          {/* Desktop Aspect Ratio Enforcer: 1664 / 1030 = ~1.6155 */}
          <div className="hidden md:block w-full pt-[61.9%]" />

          {/* ── DESKTOP VIEWPORT OVERLAY (md: and above) ── */}
          <div className="hidden md:block absolute inset-0">
            {/* Top-Left: Official Upgrade Talents India Logo */}
            <div className="absolute left-[7.5%] top-[5.2%] flex items-center gap-3">
              <img
                src="/uti-logo-dark.png"
                alt="Upgrade Talents India"
                className="h-10 w-auto object-contain drop-shadow-sm select-none"
              />
            </div>

            {/* Top-Right: Admin Portal Badge with Live Indicator */}
            <div className="absolute right-[6.8%] top-[5.8%] flex items-center gap-2.5 text-[12.5px] bg-slate-900/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-lg">
              <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white tracking-wide">Sign In</span>
              <span className="text-slate-400/80">|</span>
              <span className="text-slate-300 font-medium">Control Room</span>
            </div>

            {/* Form Container inside the Pure White Organic Scoop */}
            <div className="absolute left-[27.4%] top-[13.2%] w-[33%] max-w-[340px]">
              {/* Heading */}
              <h1 className="text-[23px] font-normal leading-tight text-slate-500 tracking-tight">
                Hello there,
              </h1>
              <h2 className="mt-0.5 text-[26px] font-extrabold leading-tight text-[#0f172a] tracking-tight">
                welcome to Upgrade Talents
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                India’s Premier Dance Championship
              </p>

              {/* Login Form */}
              <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3.5">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50/95 px-3 py-1.5 text-[11.5px] font-medium text-red-600"
                  >
                    {formError}
                  </motion.div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.16em] uppercase text-slate-500">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="username"
                    className="w-full border-b border-slate-300 py-1 text-[13.5px] text-[#0f172a] font-medium placeholder-slate-400 bg-transparent outline-none transition-colors focus:border-[#fca34d]"
                  />
                  {errors.email && (
                    <p className="mt-0.5 text-[10.5px] text-red-500 font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.16em] uppercase text-slate-500">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set a strong password"
                      autoComplete="current-password"
                      className="w-full border-b border-slate-300 py-1 pr-7 text-[13.5px] text-[#0f172a] font-medium placeholder-slate-400 bg-transparent outline-none transition-colors focus:border-[#fca34d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      tabIndex={-1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                    >
                      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setFormError("Super-admin credentials recovery is managed via secure CLI config.")}
                      className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-0.5 text-[10.5px] text-red-500 font-medium">{errors.password}</p>
                  )}
                </div>

                {/* Sunrise Gradient Login Button */}
                <div className="mt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-8 py-2 text-[12px] font-bold tracking-[0.14em] uppercase text-white shadow-[0_8px_18px_rgba(250,163,77,0.4)] transition-all duration-200 hover:shadow-[0_10px_22px_rgba(250,163,77,0.55)] hover:brightness-105 active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                  >
                    {busy ? (
                      <span className="flex items-center gap-1.5">
                        <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>LOGGING IN…</span>
                      </span>
                    ) : (
                      <span>LOGIN</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Footer "Sign in with:" */}
            <div className="absolute left-[27.4%] bottom-[5.2%] flex flex-col gap-1 text-left">
              <span className="text-[10.5px] font-semibold text-slate-200/90 tracking-wide drop-shadow-sm">
                Sign in with:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Google SSO"
                  onClick={() => setFormError("Google Workspace login restricted to verified organization admins.")}
                  className="grid size-6 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-sm"
                >
                  <span className="font-bold text-[11px]">G</span>
                </button>
                <button
                  type="button"
                  title="Admin Security Key"
                  onClick={() => setFormError("Hardware passkey configured in system settings.")}
                  className="grid size-6 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-sm"
                >
                  <svg className="size-3 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Audit Protection"
                  onClick={() => setFormError("Audit logs recorded for each administrative sign-in.")}
                  className="grid size-6 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-sm"
                >
                  <span className="font-bold text-[11px] lowercase">f</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── MOBILE / TABLET VIEWPORT (< md) ── */}
          <div className="block md:hidden bg-white text-slate-900">
            {/* Top Stage Performance Banner */}
            <div
              className="relative h-44 w-full bg-cover bg-center overflow-hidden"
              style={{
                backgroundImage: "url('/admin-dance-card.webp'), url('/admin-dance-card.jpg'), url('/admin-login-art.png')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-white flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Admin Portal</span>
              </div>
            </div>

            {/* Mobile Form Body */}
            <div className="px-6 py-6 sm:px-10 sm:py-8">
              {/* Brand Logo */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <img
                  src="/uti-logo-dark.png"
                  alt="Upgrade Talents India"
                  className="h-9 w-auto object-contain"
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                  Control Room
                </span>
              </div>

              {/* Mobile Heading */}
              <h1 className="text-[22px] font-normal leading-tight text-slate-500">
                Hello there,
              </h1>
              <h2 className="text-[25px] font-extrabold leading-tight text-[#0f172a]">
                welcome to Upgrade Talents
              </h2>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                India’s Premier Dance Championship
              </p>

              {/* Mobile Form */}
              <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-medium text-red-600">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="username"
                    className="w-full border-b border-slate-300 py-2 text-[14px] text-[#0f172a] font-medium placeholder-slate-400 bg-transparent outline-none focus:border-[#fca34d]"
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set a strong password"
                      autoComplete="current-password"
                      className="w-full border-b border-slate-300 py-2 pr-8 text-[14px] text-[#0f172a] font-medium placeholder-slate-400 bg-transparent outline-none focus:border-[#fca34d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 p-1 cursor-pointer"
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormError("Super-admin credentials recovery is managed via secure CLI config.")}
                      className="text-[11.5px] text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="mt-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-10 py-3 text-[13px] font-bold tracking-[0.14em] uppercase text-white shadow-[0_8px_20px_rgba(250,163,77,0.4)] transition-all hover:brightness-105 active:scale-95 disabled:opacity-75 cursor-pointer"
                  >
                    {busy ? "LOGGING IN…" : "LOGIN"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
