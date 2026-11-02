"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#ddfbd7] p-4 sm:p-6 md:p-8 lg:p-12 overflow-hidden selection:bg-[#fca34d]/30 selection:text-[#0f172a]">
      {/* Soft Ambient Background Glows matching the reference art */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-16 size-80 rounded-full bg-[#f8ffcc]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-16 size-96 rounded-full bg-[#e3ffb0]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/3 size-72 rounded-full bg-white/40 blur-3xl"
      />

      {/* Main Botanical Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1024px] rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-[0_24px_70px_rgba(25,60,40,0.22)] border border-white/60 bg-white"
      >
        {/* Card Background Art */}
        <div
          className="relative w-full bg-no-repeat bg-cover bg-center"
          style={{
            backgroundImage: "url('/admin-login-art.png')",
          }}
        >
          {/* Desktop Aspect Ratio Enforcer: 1664 / 1030 = ~1.6155 */}
          <div className="hidden md:block w-full pt-[61.9%]" />

          {/* ── DESKTOP VIEWPORT OVERLAY (md: and above) ── */}
          <div className="hidden md:block absolute inset-0">
            {/* Top-Left Brand Logo Name (Flower mark is in background art) */}
            <div className="absolute left-[8.6%] top-[6.2%] flex items-center gap-1.5">
              <span className="text-[14.5px] font-semibold tracking-tight text-[#475569]">
                upgrade talents
              </span>
            </div>

            {/* Top-Right Nav Links */}
            <div className="absolute right-[6.8%] top-[6.0%] flex items-center gap-2 text-[12.5px]">
              <span className="font-bold text-[#1e293b]">Sign In</span>
              <span className="text-[#9ca3af]/80">|</span>
              <span className="text-[#475569] font-medium">Admin Portal</span>
            </div>

            {/* Form Container inside the White Organic Scoop */}
            <div className="absolute left-[27.4%] top-[13.8%] w-[32.5%] max-w-[340px]">
              {/* Heading */}
              <h1 className="text-[25px] font-normal leading-tight text-[#334155] tracking-tight">
                Hello there,
              </h1>
              <h2 className="mt-0.5 text-[26px] font-bold leading-tight text-[#0f172a] tracking-tight">
                welcome to Upgrade Talents
              </h2>

              {/* Login Form */}
              <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-1.5 text-[11.5px] font-medium text-red-600"
                  >
                    {formError}
                  </motion.div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.16em] uppercase text-[#475569]">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="username"
                    className="w-full border-b border-[#cbd5e1] py-1 text-[13.5px] text-[#1e293b] placeholder-[#94a3b8] bg-transparent outline-none transition-colors focus:border-[#fca34d]"
                  />
                  {errors.email && (
                    <p className="mt-1 text-[10.5px] text-red-500 font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.16em] uppercase text-[#475569]">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set a strong password"
                      autoComplete="current-password"
                      className="w-full border-b border-[#cbd5e1] py-1 pr-7 text-[13.5px] text-[#1e293b] placeholder-[#94a3b8] bg-transparent outline-none transition-colors focus:border-[#fca34d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      tabIndex={-1}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors p-1 cursor-pointer"
                    >
                      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setFormError("Super-admin account recovery is managed via terminal credentials or root config.")}
                      className="text-[11px] text-[#94a3b8] hover:text-[#475569] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-[10.5px] text-red-500 font-medium">{errors.password}</p>
                  )}
                </div>

                {/* Login Button */}
                <div className="mt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-8 py-2 text-[12px] font-bold tracking-[0.12em] uppercase text-white shadow-[0_8px_18px_rgba(250,163,77,0.4)] transition-all duration-200 hover:shadow-[0_10px_22px_rgba(250,163,77,0.55)] hover:brightness-105 active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
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
            <div className="absolute left-[27.4%] bottom-[5.8%] flex flex-col gap-1 text-left">
              <span className="text-[10.5px] font-medium text-[#a7c5b3] tracking-wide">
                Sign in with:
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  title="Google SSO"
                  onClick={() => setFormError("Google Workspace login restricted to verified organization admins.")}
                  className="grid size-5 place-items-center rounded-full text-[#d6ede0] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="font-bold text-[11px]">G</span>
                </button>
                <button
                  type="button"
                  title="Admin Passkey"
                  onClick={() => setFormError("Hardware security keys configured in settings.")}
                  className="grid size-5 place-items-center rounded-full text-[#d6ede0] hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="size-3 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Audit Protection"
                  className="grid size-5 place-items-center rounded-full text-[#d6ede0] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="font-bold text-[11px] lowercase">f</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── MOBILE / TABLET VIEWPORT (< md) ── */}
          <div className="block md:hidden px-6 py-10 sm:px-10 sm:py-14 bg-white/95 backdrop-blur-md min-h-[520px]">
            {/* Top brand header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold tracking-tight text-[#0f172a]">
                  Upgrade Talents
                </span>
              </div>
              <span className="text-[12px] font-semibold text-[#fca34d]">Admin Portal</span>
            </div>

            {/* Mobile Heading */}
            <h1 className="text-[24px] font-normal leading-tight text-[#334155]">
              Hello there,
            </h1>
            <h2 className="text-[26px] font-bold leading-tight text-[#0f172a]">
              welcome to Upgrade Talents
            </h2>

            {/* Mobile Form */}
            <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-medium text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold tracking-[0.16em] uppercase text-[#475569]">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="username"
                  className="w-full border-b border-[#cbd5e1] py-2 text-[14px] text-[#1e293b] placeholder-[#94a3b8] bg-transparent outline-none focus:border-[#fca34d]"
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-[0.16em] uppercase text-[#475569]">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a strong password"
                    autoComplete="current-password"
                    className="w-full border-b border-[#cbd5e1] py-2 pr-8 text-[14px] text-[#1e293b] placeholder-[#94a3b8] bg-transparent outline-none focus:border-[#fca34d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[#94a3b8] p-1 cursor-pointer"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => setFormError("Super-admin account recovery is managed via terminal credentials or root config.")}
                    className="text-[11.5px] text-[#94a3b8] hover:text-[#475569] cursor-pointer"
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
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-10 py-3 text-[13px] font-bold tracking-[0.12em] uppercase text-white shadow-[0_8px_20px_rgba(250,163,77,0.4)] transition-all hover:brightness-105 active:scale-95 disabled:opacity-75 cursor-pointer"
                >
                  {busy ? "LOGGING IN…" : "LOGIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
