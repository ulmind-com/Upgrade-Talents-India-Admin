"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, Search, X, AlertCircle, Inbox, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════ BUTTON ═══════════ */

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  /** Renders the button as a link while keeping the same visual treatment. */
  href?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Button({
  children, onClick, href, type = "button", variant = "primary", size = "md",
  loading, disabled, className, ...rest
}: BtnProps) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]",
    secondary: "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-2)]",
    ghost: "text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
    success: "bg-[var(--success)] text-white hover:opacity-90",
  };
  const sizes = { sm: "h-9 px-3.5 text-[12.5px]", md: "h-11 px-5 text-[13.5px]" };

  const classes = cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap",
    "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    sizes[size], styles[variant], className
  );

  if (href && !disabled && !loading) {
    return <Link href={href} className={classes} {...rest}>{children}</Link>;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ═══════════ BADGE ═══════════ */

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: string; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-3)] text-[var(--fg-muted)]",
    brand: "bg-[var(--brand-soft)] text-[var(--brand)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold", tones[tone] || tones.neutral, className)}>
      {children}
    </span>
  );
}

/** Maps common backend status strings onto badge tones. */
export function StatusBadge({ value }: { value?: string | boolean | null }) {
  if (value === true) return <Badge tone="success">Yes</Badge>;
  if (value === false) return <Badge tone="neutral">No</Badge>;
  const v = String(value ?? "").toLowerCase();
  if (!v) return <span className="text-[var(--fg-subtle)]">—</span>;
  const map: Record<string, string> = {
    published: "success", active: "success", confirmed: "success", paid: "success", approved: "success",
    completed: "success", open: "success", live: "success", issued: "success", delivered: "success",
    pending: "warning", draft: "warning", processing: "warning", scheduled: "warning", upcoming: "info",
    cancelled: "danger", failed: "danger", revoked: "danger", expired: "danger", closed: "neutral",
    archived: "neutral", refunded: "info",
  };
  return <Badge tone={map[v] || "neutral"}>{v.replace(/_/g, " ")}</Badge>;
}

/* ═══════════ PANEL ═══════════ */

export function Panel({
  title, subtitle, action, children, className, bodyClassName,
}: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode;
  children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[15px] font-bold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ═══════════ STATES ═══════════ */

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-6 py-10 text-center">
      <AlertCircle className="size-7 text-[var(--danger)]" aria-hidden />
      <p className="max-w-md text-[13px] font-medium text-[var(--danger)]">{message}</p>
      {onRetry && <Button onClick={onRetry} variant="secondary" size="sm">Retry</Button>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-14 text-center">
      <Inbox className="size-8 text-[var(--fg-subtle)]" aria-hidden />
      <h3 className="text-[15px] font-bold">{title}</h3>
      {body && <p className="max-w-sm text-[13px] text-[var(--fg-muted)]">{body}</p>}
      {action}
    </div>
  );
}

/* ═══════════ DATA TABLE ═══════════ */

export type Column<T = any> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  width?: string;
};

export function DataTable<T extends Record<string, any>>({
  columns, rows, loading, error, onRetry, empty, searchKeys, pageSize = 10, rowKey, toolbar,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: { title: string; body?: string; action?: ReactNode };
  searchKeys?: string[];
  pageSize?: number;
  rowKey?: (row: T) => string;
  toolbar?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const searchId = useId();

  useEffect(() => { setPage(1); }, [q, rows.length]);

  const filtered = useMemo(() => {
    if (!q.trim() || !searchKeys?.length) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r?.[k] ?? "").toLowerCase().includes(needle)));
  }, [rows, q, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <Loading rows={pageSize > 6 ? 6 : pageSize} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <div className="flex flex-col gap-4">
      {(searchKeys?.length || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchKeys?.length ? (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
              <label htmlFor={searchId} className="sr-only">Search</label>
              <input
                id={searchId}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-10 pr-3 text-[13px] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--brand)]"
              />
            </div>
          ) : <span />}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {!filtered.length ? (
        <EmptyState
          title={q ? "No matches" : empty?.title || "Nothing here yet"}
          body={q ? "Try a different search term." : empty?.body}
          action={q ? <Button variant="secondary" size="sm" onClick={() => setQ("")}>Clear search</Button> : empty?.action}
        />
      ) : (
        <>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      style={c.width ? { width: c.width } : undefined}
                      className={cn("px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]", c.className)}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row, i) => (
                  <tr
                    key={rowKey?.(row) ?? String(row?._id ?? row?.id ?? i)}
                    className="border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-2)]"
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-3.5 align-middle text-[13px]", c.className)}>
                        {c.render ? c.render(row) : (row?.[c.key] ?? <span className="text-[var(--fg-subtle)]">—</span>)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Table pages" className="flex items-center justify-between gap-4 pt-1">
              <p className="text-[12.5px] text-[var(--fg-muted)]">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="grid size-9 cursor-pointer place-items-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <span className="px-2 text-[12.5px] font-semibold tabular-nums">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="grid size-9 cursor-pointer place-items-center rounded-lg border border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════ MODAL ═══════════ */

export function Modal({
  open, onClose, title, subtitle, children, footer, wide,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={ref}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-[var(--surface)] shadow-[var(--shadow-pop)] sm:rounded-2xl",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg"
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border)] px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════ CONFIRM ═══════════ */

export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; title: string; body: string; danger?: boolean; resolve?: (v: boolean) => void }>({
    open: false, title: "", body: "",
  });

  const confirm = useCallback((title: string, body: string, danger = true) =>
    new Promise<boolean>((resolve) => setState({ open: true, title, body, danger, resolve })), []);

  const close = (v: boolean) => { state.resolve?.(v); setState((s) => ({ ...s, open: false })); };

  const dialog = (
    <Modal
      open={state.open}
      onClose={() => close(false)}
      title={state.title}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
          <Button variant={state.danger ? "danger" : "primary"} onClick={() => close(true)}>Confirm</Button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-[var(--fg-muted)]">{state.body}</p>
    </Modal>
  );

  return { confirm, dialog };
}

/* ═══════════ FORM FIELDS ═══════════ */

export function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean;
  children: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-h` : undefined;
  const errId = error ? `${id}-e` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-semibold">
        {label}{required && <span className="ml-0.5 text-[var(--danger)]" aria-hidden>*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <p id={hintId} className="text-[11.5px] text-[var(--fg-subtle)]">{hint}</p>}
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {error && <p id={errId} className="flex items-center gap-1 text-[11.5px] text-[var(--danger)]"><AlertCircle className="size-3 shrink-0" aria-hidden />{error}</p>}
    </div>
  );
}

const inputBase =
  "h-11 w-full rounded-xl border bg-[var(--surface-2)] px-3.5 text-[13.5px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--brand)]";

export function Input(p: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = p;
  return <input {...rest} aria-invalid={invalid || undefined} className={cn(inputBase, invalid ? "border-[var(--danger)]" : "border-[var(--border)]", className)} />;
}

export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = p;
  return <textarea {...rest} aria-invalid={invalid || undefined} className={cn(inputBase, "h-auto min-h-24 resize-y py-3", invalid ? "border-[var(--danger)]" : "border-[var(--border)]", className)} />;
}

export function Select({ options, invalid, className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; invalid?: boolean }) {
  return (
    <select {...rest} aria-invalid={invalid || undefined} className={cn(inputBase, "cursor-pointer", invalid ? "border-[var(--danger)]" : "border-[var(--border)]", className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  const auto = useId();
  const tid = id || auto;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3">
      <label htmlFor={tid} className="cursor-pointer text-[13px] font-medium">{label}</label>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200", checked ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

/* ═══════════ RESOURCE HOOK ═══════════ */

export function useResource<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Could not load this data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}

export { Plus };
