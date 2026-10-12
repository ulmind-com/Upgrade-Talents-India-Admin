import { api, asList } from "@/shared/api";

type Q = Record<string, unknown>;
const a = <T = unknown>(path: string, o: { method?: string; body?: unknown; query?: Q | undefined } = {}) =>
  api<T>(path, { ...o, side: "admin" });

export const adminApi = {
  login: (email: string, password: string) => api("/api/admin/login", { method: "POST", body: { email, password } }),
  me: () => a<Record<string, unknown>>("/api/admin/me"),
  logout: () => a("/api/admin/logout", { method: "POST" }),
  list: (path: string, query?: Q) => a(path, { query }).then((r) => asList(r)),
  raw: a,
  events: () => a("/api/admin/events", { query: { limit: 200 } }).then((r) => asList(r)),
  createEvent: (body: Q) => a("/api/admin/events", { method: "POST", body }),
  updateEvent: (id: string, body: Q) => a(`/api/admin/events/${id}`, { method: "PUT", body }),
  deleteEvent: (id: string) => a(`/api/admin/events/${id}`, { method: "DELETE" }),
  publishEvent: (id: string) => a(`/api/admin/events/${id}/publish`, { method: "PATCH" }),
  verifyVip: (body: { verification_token: string; event_id: string; gate_id: string; access_area_id: string }) =>
    a<Record<string, unknown>>("/api/admin/vip-passes/verify", { method: "POST", body: { ...body, idempotency_key: crypto.randomUUID() } }),
  checkInTicket: (qr_token: string) => a<Record<string, unknown>>("/api/admin/tickets/check-in", { method: "POST", body: { qr_token } }),
  vipCheckins: (eventId: string) => a(`/api/admin/events/${eventId}/vip-checkins`).then((r) => asList(r)),
  vipPasses: (eventId: string) => a(`/api/admin/events/${eventId}/vip-passes`).then((r) => asList(r)),
  vipConfigs: (eventId: string) => a(`/api/admin/events/${eventId}/vip-configurations`).then((r) => asList(r)),
  revokeVip: (passId: string) => a(`/api/admin/vip-passes/${passId}/revoke`, { method: "POST", body: { reason: "Revoked by admin" } }),
  users: () => a("/api/admin/users/").then((r) => asList(r)),
  deleteUser: (email: string) => a(`/api/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" }),
};
