"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import { authApi, adminToken } from "@/lib/api";
import { useAdmin } from "@/components/Providers";
import { Button, Field, Input } from "@/components/Kit";

export default function AdminLogin() {
  const router = useRouter();
  const { admin, loading, refresh } = useAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && admin) router.replace("/"); }, [loading, admin, router]);

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
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form */}
      <div className="flex items-center justify-center px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand)]">
            <ShieldCheck className="size-6 text-white" aria-hidden />
          </span>

          <h1 className="mt-7 text-[28px] font-bold leading-tight">Control Room</h1>
          <p className="mt-2 text-[13.5px] text-[var(--fg-muted)]">
            Sign in to manage events, tickets, competitions and website content.
          </p>

          <form onSubmit={submit} noValidate className="mt-9 flex flex-col gap-4">
            {formError && (
              <p role="alert" className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-[12.5px] font-medium text-[var(--danger)]">
                {formError}
              </p>
            )}

            <Field label="Email address" error={errors.email} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" inputMode="email" autoComplete="username"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  aria-describedby={describedBy} invalid={invalid} placeholder="admin@upgradetalents.in" />
              )}
            </Field>

            <Field label="Password" error={errors.password} required>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Input id={id} type={show ? "text" : "password"} autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={describedBy} invalid={invalid} placeholder="••••••••" className="pr-12" />
                  <button type="button" onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1.5 grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]">
                    {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>

            <Button type="submit" loading={busy} className="mt-2 w-full">
              Sign in <ArrowRight className="size-4" aria-hidden />
            </Button>
          </form>

          <p className="mt-7 flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Super-admin access only. Every action is written to the audit log.
          </p>
        </motion.div>
      </div>

      {/* Visual */}
      <div className="relative hidden overflow-hidden bg-[var(--brand)] lg:block">
        <div aria-hidden className="absolute inset-0 opacity-90" style={{ background: "linear-gradient(140deg,#6d4dff,#a23bff 45%,#ff2e88)" }} />
        <div aria-hidden className="absolute -left-20 top-1/4 size-[380px] rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="absolute -right-10 bottom-10 size-[300px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <h2 className="max-w-md text-[34px] font-bold leading-[1.1]">
            One control room for the entire platform.
          </h2>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/85">
            Events, tickets, competitions, judging, voting, certificates, merchandise, rewards and
            every section of the public website — all managed from here.
          </p>
        </div>
      </div>
    </div>
  );
}
