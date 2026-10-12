import type { ReactNode } from "react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="font-display text-3xl font-bold">{title}</h1>{sub && <p className="mt-1 text-muted-foreground">{sub}</p>}</div>
      {action}
    </div>
  );
}
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-border bg-card p-6 shadow-glow ${className}`}>{children}</div>;
}
export function Pill({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{children}</span>;
}
export const fieldCls = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";
export const btnCls = "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60";
export function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
