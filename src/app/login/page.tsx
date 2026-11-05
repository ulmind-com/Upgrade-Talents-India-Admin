"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, ScanFace, X } from "lucide-react";
import { authApi, adminToken } from "@/lib/api";
import { useAdmin } from "@/components/Providers";
import * as passkey from "@/lib/passkey";

const BG_CLIPS = ["/assets/dance1.mp4", "/assets/dance2.mp4", "/assets/dance3.mp4"];

export default function AdminLogin() {
  const router = useRouter();
  const { admin, loading, refresh } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clipIdx, setClipIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Fingerprint / passkey state ──
  const [platformOk, setPlatformOk] = useState(false); // device biometric available
  const [pkBusy, setPkBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false); // post-login "set up fingerprint" offer
  const [setupBusy, setSetupBusy] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, [clipIdx]);

  // Detect platform biometric support on mount.
  useEffect(() => {
    passkey.isPlatformAvailable().then(setPlatformOk).catch(() => setPlatformOk(false));
  }, []);

  useEffect(() => {
    if (!loading && admin && !setupOpen) router.replace("/");
  }, [loading, admin, router, setupOpen]);

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
      // Offer to add a passkey if the device supports biometrics and the admin
      // has none registered yet.
      if (platformOk) {
        try {
          const { count } = await passkey.listCredentials();
          if (count === 0) {
            setSetupOpen(true);
            setBusy(false);
            return;
          }
        } catch {
          /* ignore — just proceed to the dashboard */
        }
      }
      router.replace("/");
    } catch (err: any) {
      setFormError(err?.message || "Sign-in failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  // ── Fingerprint login (usernameless, server-verified) ──
  const fingerprintLogin = async () => {
    setFormError(null);
    setPkBusy(true);
    try {
      const { access_token } = await passkey.authenticate();
      adminToken.set(access_token);
      await refresh();
      router.replace("/");
    } catch (err: any) {
      const msg = err?.message || "";
      setFormError(
        /not registered|no (pass)?key|not allowed|NotAllowed/i.test(msg)
          ? "No passkey found on this device. Sign in with your password, then add a passkey."
          : msg || "Fingerprint sign-in failed. Use your password."
      );
    } finally {
      setPkBusy(false);
    }
  };

  // ── Add a passkey right after a password login ──
  const confirmSetup = async () => {
    setSetupBusy(true);
    try {
      await passkey.register();
      setSetupOpen(false);
      router.replace("/");
    } catch (err: any) {
      setFormError(err?.message || "Could not set up fingerprint.");
      setSetupOpen(false);
      router.replace("/");
    } finally {
      setSetupBusy(false);
    }
  };

  const skipSetup = () => {
    setSetupOpen(false);
    router.replace("/");
  };

  const showFingerprint = platformOk; // device has a biometric sensor

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-black p-4 sm:p-6 md:p-8 lg:p-12 overflow-hidden selection:bg-[#fca34d]/30 selection:text-white">
      {/* ── CINEMATIC DANCE VIDEO BACKGROUND & POSTER ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Fallback & Pre-load Dance Stage Poster Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105"
          style={{
            backgroundImage: "url('/admin-dance-card.webp'), url('/admin-dance-card.jpg'), url('/admin-login-art.png')",
          }}
        />

        {/* Fullscreen Looping Video Reel */}
        <video
          ref={videoRef}
          key={BG_CLIPS[clipIdx]}
          autoPlay
          muted
          playsInline
          poster="/admin-dance-card.webp"
          onEnded={() => setClipIdx((i) => (i + 1) % BG_CLIPS.length)}
          className="absolute inset-0 size-full object-cover object-center scale-105 transition-opacity duration-700"
        >
          <source src={BG_CLIPS[clipIdx]} type="video/mp4" />
        </video>

        {/* Ambient Dark Gradient & Cinematic Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070a12]/75 via-[#0b101e]/60 to-[#05070d]/80 backdrop-blur-[2px]" />

        {/* Dynamic Stage Lighting & Neon Atmosphere */}
        <div className="absolute -top-32 right-1/4 size-[480px] rounded-full bg-amber-500/20 blur-[130px] mix-blend-screen" />
        <div className="absolute -bottom-32 left-10 size-[520px] rounded-full bg-violet-600/20 blur-[140px] mix-blend-screen" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-sky-500/15 blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.05)_0%,transparent_75%)]" />
      </div>

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
                <div className="mt-1 flex items-center gap-2.5">
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

                  {showFingerprint && (
                    <button
                      type="button"
                      onClick={fingerprintLogin}
                      disabled={pkBusy || busy}
                      title="Sign in with your fingerprint / passkey"
                      aria-label="Sign in with fingerprint"
                      className="group relative grid size-10 shrink-0 place-items-center rounded-full border border-[#fca34d]/40 bg-white text-[#f1872f] shadow-[0_4px_14px_rgba(250,163,77,0.25)] transition-all duration-200 hover:border-[#fca34d] hover:shadow-[0_6px_18px_rgba(250,163,77,0.4)] active:scale-95 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                    >
                      <span className="pointer-events-none absolute inset-0 rounded-full bg-[#fca34d]/15 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                      {pkBusy ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-[#f1872f] border-t-transparent" />
                      ) : (
                        <Fingerprint className="size-5" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                {showFingerprint && (
                  <p className="-mt-1.5 text-[10.5px] font-medium text-slate-400">
                    Tap the fingerprint to sign in with your passkey.
                  </p>
                )}
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

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 sm:flex-none sm:w-auto inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-10 py-3 text-[13px] font-bold tracking-[0.14em] uppercase text-white shadow-[0_8px_20px_rgba(250,163,77,0.4)] transition-all hover:brightness-105 active:scale-95 disabled:opacity-75 cursor-pointer"
                  >
                    {busy ? "LOGGING IN…" : "LOGIN"}
                  </button>

                  {showFingerprint && (
                    <button
                      type="button"
                      onClick={fingerprintLogin}
                      disabled={pkBusy || busy}
                      aria-label="Sign in with fingerprint"
                      className="relative grid size-12 shrink-0 place-items-center rounded-full border border-[#fca34d]/40 bg-white text-[#f1872f] shadow-[0_4px_14px_rgba(250,163,77,0.25)] transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      {pkBusy ? (
                        <span className="size-5 animate-spin rounded-full border-2 border-[#f1872f] border-t-transparent" />
                      ) : (
                        <Fingerprint className="size-6" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                {showFingerprint && (
                  <p className="-mt-2 text-[11px] font-medium text-slate-400">
                    Tap the fingerprint to sign in with your passkey.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── FINGERPRINT SETUP OFFER (after a password login) ── */}
      <AnimatePresence>
        {setupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Set up fingerprint sign-in"
              className="relative w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/15 bg-white text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            >
              <button
                type="button"
                onClick={skipSetup}
                aria-label="Not now"
                className="absolute right-4 top-4 grid size-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-4" aria-hidden />
              </button>

              <div className="flex flex-col items-center px-7 pt-9 pb-7 text-center">
                <div className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] text-white shadow-[0_10px_30px_rgba(250,163,77,0.5)]">
                  <span className="absolute inset-0 rounded-full bg-[#fca34d]/40 animate-ping" />
                  <ScanFace className="relative size-10" aria-hidden />
                </div>

                <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-[#0f172a]">
                  Set up fingerprint sign-in
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                  Skip the password next time. Unlock this admin panel with your
                  fingerprint or Face ID — just like your phone. A synced passkey
                  works on your other devices too.
                </p>

                <div className="mt-6 flex w-full flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={confirmSetup}
                    disabled={setupBusy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#fca34d] via-[#f7ad4f] to-[#f5b85a] px-6 py-3 text-[13px] font-bold tracking-wide uppercase text-white shadow-[0_8px_20px_rgba(250,163,77,0.45)] transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                  >
                    {setupBusy ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Setting up…</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="size-4" aria-hidden />
                        <span>Enable fingerprint</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={skipSetup}
                    disabled={setupBusy}
                    className="w-full rounded-full px-6 py-2.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:pointer-events-none cursor-pointer"
                  >
                    Not now
                  </button>
                </div>

                <p className="mt-4 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
                  Your fingerprint never leaves your device — only a public key is stored.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
