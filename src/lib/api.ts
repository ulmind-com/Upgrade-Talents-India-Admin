/**
 * Upgrade Talents India Admin API client.
 * One typed function per backend endpoint — the backend contract is never altered here.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const TOKEN_KEY = "uti_admin_token";

export const adminToken = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function detail(data: any, fallback: string) {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) {
    const first = d[0];
    const loc = Array.isArray(first?.loc) ? first.loc.filter((p: any) => p !== "body").join(".") : "";
    return loc ? `${loc}: ${first.msg}` : first?.msg || fallback;
  }
  return data?.message || fallback;
}

type Opts = {
  method?: string;
  body?: any;
  form?: FormData;
  query?: Record<string, any>;
  auth?: boolean;
  raw?: boolean;
};

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, form, query, auth = true, raw } = opts;

  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {};
  if (!form && body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = adminToken.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the API server. Check that the backend is running.", 0);
  }

  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/admin/login")) {
    adminToken.clear();
    window.location.href = "/login";
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (raw) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
    return (await res.blob()) as T;
  }

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) throw new ApiError(detail(data, `Request failed (${res.status})`), res.status);
  return data as T;
}

/** Returns a fallback instead of throwing — for optional dashboard widgets. */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

/* ═══════════════ AUTH ═══════════════ */
export const authApi = {
  login: (email: string, password: string) =>
    api<{ access_token: string; token_type?: string }>("/api/admin/login", {
      method: "POST", body: { email, password }, auth: false,
    }),
  me: () => api<any>("/api/admin/me"),
  logout: () => api<any>("/api/admin/logout", { method: "POST" }),
  bootstrap: () => api<any>("/api/admin/bootstrap", { method: "POST", auth: false }),
  changePassword: (current_password: string, new_password: string) =>
    api<{ message: string }>("/api/admin/change-password", {
      method: "POST", body: { current_password, new_password },
    }),
  changeEmail: (current_password: string, new_email: string) =>
    api<{ message: string; access_token: string; token_type?: string; email: string }>("/api/admin/change-email", {
      method: "POST", body: { current_password, new_email },
    }),
};

/* ═══════════════ CMS (website control room) ═══════════════ */
const cms = "/api/admin";
export const cmsApi = {
  getSettings: () => api<any>(`${cms}/website-settings`),
  updateSettings: (body: any) => api<any>(`${cms}/website-settings`, { method: "PUT", body }),

  listEvents: (q?: any) => api<any[]>(`${cms}/events`, { query: q }),
  createEvent: (body: any) => api<any>(`${cms}/events`, { method: "POST", body }),
  updateEvent: (id: string, body: any) => api<any>(`${cms}/events/${id}`, { method: "PUT", body }),
  deleteEvent: (id: string) => api<any>(`${cms}/events/${id}`, { method: "DELETE" }),
  publishEvent: (id: string, q: any) => api<any>(`${cms}/events/${id}/publish`, { method: "PATCH", query: q }),
  visibilityEvent: (id: string, q: any) => api<any>(`${cms}/events/${id}/visibility`, { method: "PATCH", query: q }),
  reorderEvent: (id: string, q: any) => api<any>(`${cms}/events/${id}/reorder`, { method: "PATCH", query: q }),

  listLiveEvents: () => api<any[]>(`${cms}/live-events`),
  createLiveEvent: (body: any) => api<any>(`${cms}/live-events`, { method: "POST", body }),
  updateLiveEvent: (id: string, body: any) => api<any>(`${cms}/live-events/${id}`, { method: "PUT", body }),
  deleteLiveEvent: (id: string) => api<any>(`${cms}/live-events/${id}`, { method: "DELETE" }),
  publishLiveEvent: (id: string, q: any) => api<any>(`${cms}/live-events/${id}/publish`, { method: "PATCH", query: q }),

  listBanners: () => api<any[]>(`${cms}/banners`),
  createBanner: (body: any) => api<any>(`${cms}/banners`, { method: "POST", body }),
  updateBanner: (id: string, body: any) => api<any>(`${cms}/banners/${id}`, { method: "PUT", body }),
  deleteBanner: (id: string) => api<any>(`${cms}/banners/${id}`, { method: "DELETE" }),
  publishBanner: (id: string, q: any) => api<any>(`${cms}/banners/${id}/publish`, { method: "PATCH", query: q }),

  listTestimonials: () => api<any[]>(`${cms}/testimonials`),
  createTestimonial: (body: any) => api<any>(`${cms}/testimonials`, { method: "POST", body }),
  updateTestimonial: (id: string, body: any) => api<any>(`${cms}/testimonials/${id}`, { method: "PUT", body }),
  deleteTestimonial: (id: string) => api<any>(`${cms}/testimonials/${id}`, { method: "DELETE" }),
  approveTestimonial: (id: string, q: any) => api<any>(`${cms}/testimonials/${id}/approve`, { method: "PATCH", query: q }),
  publishTestimonial: (id: string, q: any) => api<any>(`${cms}/testimonials/${id}/publish`, { method: "PATCH", query: q }),

  listTickets: (q?: any) => api<any[]>(`${cms}/tickets`, { query: q }),
  createTicket: (body: any) => api<any>(`${cms}/tickets`, { method: "POST", body }),
  updateTicket: (id: string, body: any) => api<any>(`${cms}/tickets/${id}`, { method: "PUT", body }),
  deleteTicket: (id: string) => api<any>(`${cms}/tickets/${id}`, { method: "DELETE" }),
  listEventBookings: (eventId: string, q?: any) => api<any>(`${cms}/events/${eventId}/bookings`, { query: q }),
  listAllBookings: (q?: any) => api<any>(`${cms}/bookings`, { query: q }),
  getBookingDetail: (bookingId: string) => api<any>(`${cms}/bookings/${bookingId}`),

  listContestPromos: () => api<any[]>(`${cms}/contest-promotions`),
  createContestPromo: (body: any) => api<any>(`${cms}/contest-promotions`, { method: "POST", body }),
  updateContestPromo: (id: string, body: any) => api<any>(`${cms}/contest-promotions/${id}`, { method: "PUT", body }),
  deleteContestPromo: (id: string) => api<any>(`${cms}/contest-promotions/${id}`, { method: "DELETE" }),
  publishContestPromo: (id: string, q: any) => api<any>(`${cms}/contest-promotions/${id}/publish`, { method: "PATCH", query: q }),

  getAppPromo: () => api<any>(`${cms}/app-promotion`),
  updateAppPromo: (body: any) => api<any>(`${cms}/app-promotion`, { method: "PUT", body }),

  getContact: () => api<any>(`${cms}/contact-info`),
  updateContact: (body: any) => api<any>(`${cms}/contact-info`, { method: "PUT", body }),

  listLinks: () => api<any[]>(`${cms}/important-links`),
  createLink: (body: any) => api<any>(`${cms}/important-links`, { method: "POST", body }),
  updateLink: (id: string, body: any) => api<any>(`${cms}/important-links/${id}`, { method: "PUT", body }),
  deleteLink: (id: string) => api<any>(`${cms}/important-links/${id}`, { method: "DELETE" }),

  auditLogs: (q?: any) => api<any>(`${cms}/audit-logs`, { query: q }),
  getVotingSettings: () => api<any>(`${cms}/voting-settings`),
  updateVotingSettings: (body: any) => api<any>(`${cms}/voting-settings`, { method: "PUT", body }),
};

/* ═══════════════ USERS ═══════════════ */
export const usersApi = {
  list: (q?: any) => api<any>("/api/admin/users/", { query: q }),
  remove: (email: string) => api<any>(`/api/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" }),
  recycleBin: (q?: any) => api<any>("/api/admin/users/recycle-bin", { query: q }),
  restore: (id: string) => api<any>(`/api/admin/users/recycle-bin/${id}/restore`, { method: "POST" }),
  forceDelete: (id: string) => api<any>(`/api/admin/users/recycle-bin/${id}/force`, { method: "DELETE" }),
  profileSummary: (id: string) => api<any>(`/api/admin/users/${id}/profile-summary`),
  activity: (id: string, q?: any) => api<any>(`/api/admin/users/${id}/activity`, { query: q }),
  events: (id: string) => api<any>(`/api/admin/users/${id}/events`),
  competitions: (id: string) => api<any>(`/api/admin/users/${id}/competitions`),
  courses: (id: string) => api<any>(`/api/admin/users/${id}/courses`),
  workshops: (id: string) => api<any>(`/api/admin/users/${id}/workshops`),
  badges: (id: string) => api<any>(`/api/admin/users/${id}/badges`),
  certificates: (id: string) => api<any>(`/api/admin/users/${id}/certificates`),
  achievements: (id: string) => api<any>(`/api/admin/users/${id}/achievements`),
  activitySummary: (id: string) => api<any>(`/api/admin/users/${id}/activity-summary`),
  vipBookings: (id: string) => api<any>(`/api/admin/users/${id}/vip-bookings`),
};

/* ═══════════════ COMPETITIONS ═══════════════ */
const comp = "/api/admin/advanced-competitions";
export const competitionsApi = {
  list: (q?: any) => api<any>(`${comp}/`, { query: q }),
  create: (body: any) => api<any>(`${comp}/`, { method: "POST", body }),
  update: (id: string, body: any) => api<any>(`${comp}/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api<any>(`${comp}/${id}`, { method: "DELETE" }),
  publish: (id: string) => api<any>(`${comp}/${id}/publish`, { method: "POST" }),
  unpublish: (id: string) => api<any>(`${comp}/${id}/unpublish`, { method: "POST" }),
  overview: (id: string) => api<any>(`${comp}/${id}/overview`),
  judgingProgress: (id: string) => api<any>(`${comp}/${id}/judging/progress`),
  lockJudging: (id: string) => api<any>(`${comp}/${id}/judging/lock`, { method: "POST" }),
  closeJudging: (id: string) => api<any>(`${comp}/${id}/judging/close`, { method: "POST" }),
  closeVoting: (id: string) => api<any>(`${comp}/${id}/voting/close`, { method: "POST" }),
  recalculate: (id: string) => api<any>(`${comp}/${id}/recalculate-rankings`, { method: "POST" }),
  startFinalization: (id: string) => api<any>(`${comp}/${id}/finalization/start`, { method: "POST" }),
  approveResults: (id: string) => api<any>(`${comp}/${id}/results/approve`, { method: "POST" }),
  publishResults: (id: string) => api<any>(`${comp}/${id}/results/publish`, { method: "POST" }),
  openSession: (id: string, pin?: string) =>
    api<any>(`${comp}/${id}/session/open`, { method: "POST", query: pin ? { pin } : undefined }),
  closeSession: (id: string) => api<any>(`${comp}/${id}/session/close`, { method: "POST" }),
  feedbacks: (id: string) => api<any>(`${comp}/${id}/feedbacks`),
  participants: (id: string, q?: any) => api<any>(`${comp}/${id}/participants`, { query: q }),
  uploadCard: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api<any>(`${comp}/upload-card`, { method: "POST", form: fd });
  },
  uploadBanner: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api<any>(`${comp}/upload-banner`, { method: "POST", form: fd });
  },
};

/* ═══════════════ JUDGES / VOLUNTEERS ═══════════════ */
export const judgesApi = {
  list: (q?: any) => api<any>("/api/admin/judges/", { query: q }),
  create: (body: any) => api<any>("/api/admin/judges/", { method: "POST", body }),
  sendInvitation: (email: string) =>
    api<any>(`/api/admin/judges/${encodeURIComponent(email)}/send-invitation`, { method: "POST" }),
  assign: (body: any) => api<any>("/api/admin/judges/assignments", { method: "POST", body }),
  unassign: (body: any) => api<any>("/api/admin/judges/assignments", { method: "DELETE", body }),
};

export const kycApi = {
  analytics: () => api<any>("/api/admin/kyc/analytics"),
  records: (q?: any) => api<any>("/api/admin/kyc/records", { query: q }),
  record: (email: string) => api<any>(`/api/admin/kyc/records/${encodeURIComponent(email)}`),
  override: (email: string, body: { status: "VERIFIED" | "REJECTED"; reason: string }) =>
    api<any>(`/api/admin/kyc/records/${encodeURIComponent(email)}/override`, { method: "POST", body }),
};

export const volunteersApi = {
  list: (q?: any) => api<any>("/api/admin/volunteers/", { query: q }),
  create: (body: any) => api<any>("/api/admin/volunteers/", { method: "POST", body }),
  remove: (email: string) => api<any>(`/api/admin/volunteers/${encodeURIComponent(email)}`, { method: "DELETE" }),
};

/* ═══════════════ COURSES / WORKSHOPS ═══════════════ */
function learnApi(base: string) {
  return {
    list: (q?: any) => api<any>(`${base}/`, { query: q }),
    create: (body: any) => api<any>(`${base}/`, { method: "POST", body }),
    get: (id: string) => api<any>(`${base}/${id}`),
    update: (id: string, body: any) => api<any>(`${base}/${id}`, { method: "PUT", body }),
    publish: (id: string, q: any) => api<any>(`${base}/${id}/publish`, { method: "PATCH", query: q }),
    remove: (id: string) => api<any>(`${base}/${id}`, { method: "DELETE" }),
    registrations: (id: string, q?: any) => api<any>(`${base}/${id}/registrations`, { query: q }),
    registrationStats: (id: string) => api<any>(`${base}/${id}/registration-stats`),
  };
}
export const coursesApi = learnApi("/api/admin/courses");
export const workshopsApi = learnApi("/api/admin/workshops");

/* ═══════════════ VIP ═══════════════ */
const vip = "/api/admin";
export const vipApi = {
  listConfigs: (eventId: string) => api<any>(`${vip}/events/${eventId}/vip-configurations`),
  createConfig: (eventId: string, body: any) => api<any>(`${vip}/events/${eventId}/vip-configurations`, { method: "POST", body }),
  getConfig: (id: string) => api<any>(`${vip}/vip-configurations/${id}`),
  updateConfig: (id: string, body: any) => api<any>(`${vip}/vip-configurations/${id}`, { method: "PUT", body }),
  enableConfig: (id: string) => api<any>(`${vip}/vip-configurations/${id}/enable`, { method: "POST" }),
  disableConfig: (id: string) => api<any>(`${vip}/vip-configurations/${id}/disable`, { method: "POST" }),
  capacity: (eventId: string) => api<any>(`${vip}/events/${eventId}/vip-capacity`),
  analytics: (eventId: string) => api<any>(`${vip}/events/${eventId}/vip-analytics`),
  issuePass: (eventId: string, body: any) => api<any>(`${vip}/events/${eventId}/vip-passes/issue`, { method: "POST", body }),
  listPasses: (eventId: string, q?: any) => api<any>(`${vip}/events/${eventId}/vip-passes`, { query: q }),
  getPass: (id: string) => api<any>(`${vip}/vip-passes/${id}`),
  revokePass: (id: string, body?: any) => api<any>(`${vip}/vip-passes/${id}/revoke`, { method: "POST", body }),
  passHistory: (id: string) => api<any>(`${vip}/vip-passes/${id}/history`),
  listBookings: (eventId: string, q?: any) => api<any>(`${vip}/events/${eventId}/vip-bookings`, { query: q }),
  listAllBookings: (q?: any) => api<any>(`${vip}/vip-bookings`, { query: q }),
  cancelBooking: (id: string, body?: any) => api<any>(`${vip}/vip-bookings/${id}/cancel`, { method: "POST", body }),
  checkins: (eventId: string, q?: any) => api<any>(`${vip}/events/${eventId}/vip-checkins`, { query: q }),
  verifyPass: (body: any) => api<any>(`${vip}/vip-passes/verify`, { method: "POST", body }),
};

/* ═══════════════ CHECK-IN (tickets at the gate) ═══════════════ */
export const checkinApi = {
  verify: (body: any) => api<any>("/api/admin/tickets/verify", { method: "POST", body }),
  checkIn: (body: any) => api<any>("/api/admin/tickets/check-in", { method: "POST", body }),
};

/* ═══════════════ MERCHANDISE ═══════════════ */
const merch = "/api/admin/merchandise";
export const merchApi = {
  listProducts: (q?: any) => api<any>(`${merch}/products`, { query: q }),
  createProduct: (body: any) => api<any>(`${merch}/products`, { method: "POST", body }),
  getProduct: (id: string) => api<any>(`${merch}/products/${id}`),
  updateProduct: (id: string, body: any) => api<any>(`${merch}/products/${id}`, { method: "PUT", body }),
  publishProduct: (id: string) => api<any>(`${merch}/products/${id}/publish`, { method: "POST" }),
  archiveProduct: (id: string) => api<any>(`${merch}/products/${id}/archive`, { method: "POST" }),
  uploadImage: (form: FormData) => api<any>(`${merch}/upload-image`, { method: "POST", form }),
  listOrders: (q?: any) => api<any>(`${merch}/orders`, { query: q }),
  getOrder: (id: string) => api<any>(`${merch}/orders/${id}`),
  setOrderStatus: (id: string, body: any) => api<any>(`${merch}/orders/${id}/status`, { method: "PATCH", body }),
  inventory: (q?: any) => api<any>(`${merch}/inventory`, { query: q }),
  adjustInventory: (body: any) => api<any>(`${merch}/inventory/adjustments`, { method: "POST", body }),
  analytics: () => api<any>(`${merch}/analytics`),
};

/* ═══════════════ NOTIFICATIONS ═══════════════ */
const notif = "/api/admin/notifications";
export const notificationsApi = {
  list: (q?: any) => api<any>(`${notif}/announcements`, { query: q }),
  create: (body: any) => api<any>(`${notif}/announcements`, { method: "POST", body }),
  get: (id: string) => api<any>(`${notif}/announcements/${id}`),
  update: (id: string, body: any) => api<any>(`${notif}/announcements/${id}`, { method: "PATCH", body }),
  publish: (id: string) => api<any>(`${notif}/announcements/${id}/publish`, { method: "POST" }),
  cancel: (id: string) => api<any>(`${notif}/announcements/${id}/cancel`, { method: "POST" }),
  analytics: () => api<any>(`${notif}/analytics`),
};

/* ═══════════════ REWARDS & REFERRALS ═══════════════ */
export const rewardsApi = {
  referralConfig: () => api<any>("/api/admin/referral/config"),
  updateReferralConfig: (body: any) => api<any>("/api/admin/referral/config", { method: "PUT", body }),
  rewardsConfig: () => api<any>("/api/admin/rewards/config"),
  updateRewardsConfig: (body: any) => api<any>("/api/admin/rewards/config", { method: "PUT", body }),
  expiryConfig: () => api<any>("/api/admin/rewards/expiry-config"),
  updateExpiryConfig: (body: any) => api<any>("/api/admin/rewards/expiry-config", { method: "PUT", body }),
  referrals: (q?: any) => api<any>("/api/admin/referrals", { query: q }),
  referral: (id: string) => api<any>(`/api/admin/referrals/${id}`),
  transactions: (q?: any) => api<any>("/api/admin/rewards/transactions", { query: q }),
  expiryReport: (q?: any) => api<any>("/api/admin/rewards/expiry-report", { query: q }),
  triggerExpiry: () => api<any>("/api/admin/rewards/trigger-expiry", { method: "POST" }),
  analytics: () => api<any>("/api/admin/referral/analytics"),
};

/* ═══════════════ CERTIFICATES & BADGES ═══════════════ */
export const certificatesApi = {
  list: (q?: any) => api<any>("/api/admin/certificates", { query: q }),
  get: (id: string) => api<any>(`/api/admin/certificates/${id}`),
  download: (id: string) => api<Blob>(`/api/admin/certificates/${id}/download`, { raw: true }),
  revoke: (id: string, body?: any) => api<any>(`/api/admin/certificates/${id}/revoke`, { method: "POST", body }),
  analytics: () => api<any>("/api/admin/certificates/analytics/overview"),
  eligibility: (compId: string) => api<any>(`/api/admin/competitions/${compId}/certificate-eligibility`),
  awardConfig: (compId: string) => api<any>(`/api/admin/competitions/${compId}/award-config`),
  updateAwardConfig: (compId: string, body: any) => api<any>(`/api/admin/competitions/${compId}/award-config`, { method: "PUT", body }),
  generate: (compId: string, body?: any) => api<any>(`/api/admin/competitions/${compId}/certificates/generate`, { method: "POST", body }),
  byCompetition: (compId: string, q?: any) => api<any>(`/api/admin/competitions/${compId}/certificates`, { query: q }),
};

export const badgesApi = {
  list: (q?: any) => api<any>("/api/admin/badges/", { query: q }),
  config: () => api<any>("/api/admin/badges/config"),
  updateConfig: (body: any) => api<any>("/api/admin/badges/config", { method: "PUT", body }),
  reconcile: () => api<any>("/api/admin/badges/reconcile", { method: "POST" }),
  analytics: () => api<any>("/api/admin/badges/analytics"),
  revoke: (awardId: string, body?: any) => api<any>(`/api/admin/badges/user-badges/${awardId}/revoke`, { method: "POST", body }),
};

/** Normalises the different list shapes the backend returns. */
export function toRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  for (const key of ["items", "data", "results", "rows", "records", "users", "events", "orders", "products", "announcements", "transactions", "referrals", "certificates", "passes", "bookings", "participants", "judges", "volunteers", "competitions", "logs", "badges"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

export function totalOf(payload: any, rows: any[]): number {
  return Number(payload?.total ?? payload?.count ?? payload?.total_count ?? rows.length) || rows.length;
}
