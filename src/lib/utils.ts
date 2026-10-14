import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

export function formatINR(v?: number | null) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

export function formatNumber(v?: number | null) {
  return new Intl.NumberFormat("en-IN").format(Number(v ?? 0));
}

export function formatDate(v?: string | Date | null, withTime = false) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function titleCase(s?: string | null) {
  if (!s) return "—";
  return String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Reads an id from any of the shapes the backend uses. */
export function rowId(row: any): string {
  return String(row?._id ?? row?.id ?? row?.email ?? row?.reference ?? "");
}

export function toDateInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function toDateTimeInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
