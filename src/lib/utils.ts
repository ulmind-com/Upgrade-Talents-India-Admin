import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

/**
 * Parse a datetime value the API returns, always as a true instant.
 *
 * The backend stores competition times as UTC but serializes them WITHOUT a
 * timezone designator (e.g. "2026-12-06T04:30:00"). JavaScript reads such a
 * date-time string as the host's LOCAL time, so the same value renders
 * differently per machine and an IST render comes out 5h30 wrong. Any
 * timezone-less date-time is therefore read as UTC here. Strings that already
 * carry a Z or offset, Date objects, and bare date-only values are left to the
 * normal parser.
 */
export function parseApiDate(v?: string | Date | null): Date {
  if (v instanceof Date) return v;
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/.test(s)) {
    return new Date(`${s.replace(" ", "T")}Z`);
  }
  return new Date(s);
}

export function formatINR(v?: number | string | null) {
  if (v == null || v === "") return "₹0";
  const n = Number(v);
  if (isNaN(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatNumber(v?: number | string | null) {
  if (v == null || v === "") return "0";
  return new Intl.NumberFormat("en-IN").format(Number(v ?? 0));
}

export function formatDate(v?: string | Date | null, withTime = false) {
  if (!v) return "—";
  const d = parseApiDate(v);
  if (isNaN(d.getTime())) return String(v);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  };
  const formatted = new Intl.DateTimeFormat("en-IN", options).format(d);
  if (!withTime) return formatted;
  const withUpper = formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  return `${withUpper} IST`;
}

export function formatTimeIST(v?: string | Date | null) {
  if (!v) return "—";
  const d = parseApiDate(v);
  if (isNaN(d.getTime())) return String(v);
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase())} IST`;
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
  const d = parseApiDate(v);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function toDateTimeInput(v?: string | null) {
  if (!v) return "";
  const d = parseApiDate(v);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minute = get("minute");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** Converts an input date/datetime string entered in IST to a full ISO string (UTC) */
export function fromDateTimeInput(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const normalized = s.replace(" ", "T");
  if (normalized.length === 10) {
    const d = new Date(`${normalized}T00:00:00+05:30`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const withSecs = normalized.length === 16 ? `${normalized}:00` : normalized;
  const istString = `${withSecs}+05:30`;
  const d = new Date(istString);
  return isNaN(d.getTime()) ? null : d.toISOString();
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
