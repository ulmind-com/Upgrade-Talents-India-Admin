"use client";

import { useState } from "react";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import {
  Button, DataTable, EmptyState, ErrorState, Loading, Modal, Panel, StatusBadge, useConfirm, useResource,
} from "@/components/Kit";
import { KeyValues } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { usersApi, safe, toRows } from "@/lib/api";
import { formatDate, rowId, titleCase } from "@/lib/utils";

export default function UsersPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<"active" | "bin">("active");
  const [detail, setDetail] = useState<any | null>(null);

  const { data, loading, error, reload } = useResource(
    () => (tab === "active" ? usersApi.list({ limit: 200 }) : usersApi.recycleBin({ limit: 200 })),
    [tab]
  );

  const rows = toRows(data);

  const deleteUser = async (row: any) => {
    const ok = await confirm("Delete this user?", `${row.email} will be moved to the recycle bin.`);
    if (!ok) return;
    try { await usersApi.remove(row.email); push("success", "User moved to the recycle bin."); reload(); }
    catch (e: any) { push("error", e?.message || "Delete failed."); }
  };

  const restore = async (row: any) => {
    try { await usersApi.restore(rowId(row)); push("success", "User restored."); reload(); }
    catch (e: any) { push("error", e?.message || "Restore failed."); }
  };

  const purge = async (row: any) => {
    const ok = await confirm("Permanently delete?", "This removes the account for good and cannot be undone.");
    if (!ok) return;
    try { await usersApi.forceDelete(rowId(row)); push("success", "User permanently deleted."); reload(); }
    catch (e: any) { push("error", e?.message || "Delete failed."); }
  };

  const columns = [
    { key: "name", header: "User", render: (r: any) => (
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand)]">
          {String(r.name || r.email || "?").slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{r.name || "Unnamed"}</span>
          <span className="block truncate text-[11.5px] text-[var(--fg-muted)]">{r.email}</span>
        </span>
      </div>
    ) },
    { key: "phone_number", header: "Phone", render: (r: any) => r.phone_number || "—" },
    { key: "created_at", header: "Joined", render: (r: any) => formatDate(r.created_at || r.registered_at) },
    { key: "is_verified", header: "Verified", render: (r: any) => <StatusBadge value={r.is_verified ?? r.verified} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {([["active", "Active users"], ["bin", "Recycle bin"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === k ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel title={tab === "active" ? "Registered users" : "Deleted users"} subtitle={tab === "active" ? "Everyone who signed up on the website or app" : "Restore or permanently remove"}>
        <DataTable
          columns={[
            ...columns,
            {
              key: "__a", header: "Actions", className: "text-right",
              render: (r: any) => (
                <div className="flex items-center justify-end gap-1.5">
                  {tab === "active" ? (
                    <>
                      <button onClick={() => setDetail(r)} aria-label="View user" className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--brand)]">
                        <Eye className="size-4" aria-hidden />
                      </button>
                      <button onClick={() => deleteUser(r)} aria-label="Delete user" className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => restore(r)}><RotateCcw className="size-3.5" aria-hidden /> Restore</Button>
                      <Button size="sm" variant="danger" onClick={() => purge(r)}>Delete</Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          searchKeys={["name", "email", "phone_number"]}
          pageSize={12}
          empty={{ title: tab === "active" ? "No users yet" : "Recycle bin is empty" }}
        />
      </Panel>

      <UserDetail user={detail} onClose={() => setDetail(null)} />
      {dialog}
    </div>
  );
}

function UserDetail({ user, onClose }: { user: any | null; onClose: () => void }) {
  const id = user ? rowId(user) : "";
  const { data, loading } = useResource(
    async () => (!id ? null : {
      summary: await safe(usersApi.profileSummary(id), null),
      achievements: await safe(usersApi.achievements(id), null),
      activity: await safe(usersApi.activitySummary(id), null),
      tickets: await safe(usersApi.ticketBookings(id), null),
    }),
    [id]
  );

  return (
    <Modal open={!!user} onClose={onClose} title={user?.name || user?.email || "User"} subtitle={user?.email} wide>
      {loading ? (
        <Loading rows={4} />
      ) : (
        <div className="flex flex-col gap-6">
          <KeyValues
            items={[
              { k: "Email", v: user?.email },
              { k: "Phone", v: user?.phone_number || "—" },
              { k: "Date of birth", v: formatDate(user?.date_of_birth) },
              { k: "Address", v: user?.address || "—" },
              { k: "Referral code", v: user?.referral_code || "—" },
              { k: "Joined", v: formatDate(user?.created_at || user?.registered_at, true) },
              { k: "Verified", v: <StatusBadge value={user?.is_verified ?? user?.verified} /> },
            ]}
          />

          {/* Ticket Bookings & Passes History */}
          <Panel
            title="Ticket Bookings & Gate Admission History"
            subtitle={
              data?.tickets?.total_bookings != null
                ? `${data.tickets.total_bookings} booking(s) • ${data.tickets.total_tickets_bought} ticket(s) purchased • ₹${Number(data.tickets.total_spent || 0).toLocaleString("en-IN")} total spent`
                : "Record of all event passes and tickets purchased by this user"
            }
            className="shadow-none"
          >
            {data?.tickets?.bookings?.length ? (
              <div className="flex flex-col gap-3">
                {data.tickets.bookings.map((b: any) => {
                  const bQty = Number(b.quantity || 1);
                  const tix: any[] = b.tickets || [];
                  const checkedIn = tix.filter((t: any) => t.is_checked_in).length;
                  const isAll = checkedIn === bQty && bQty > 0;
                  return (
                    <div
                      key={b._id || b.booking_reference}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--brand)]">
                            {b.booking_reference}
                          </span>
                          <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                            {b.payment_method || "ONLINE"}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[var(--fg-muted)]">
                          {formatDate(b.booked_at || b.created_at, true)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-[var(--fg-subtle)] font-bold">Event</span>
                          <p className="font-semibold text-white truncate">{b.event_title || "Event"}</p>
                          <p className="text-[10.5px] text-[var(--fg-muted)]">{b.event_venue || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-[var(--fg-subtle)] font-bold">Tickets / Cost</span>
                          <p className="font-bold text-white">{bQty} ticket{bQty > 1 ? "s" : ""}</p>
                          <p className="font-mono text-[10.5px] text-[var(--fg-muted)]">₹{Number(b.total_amount || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-[var(--fg-subtle)] font-bold">Booking Status</span>
                          <p className={`font-bold ${b.booking_status === "CONFIRMED" ? "text-green-400" : "text-amber-400"}`}>
                            {b.booking_status}
                          </p>
                          <p className="text-[10px] font-mono text-[var(--fg-muted)]">{b.payment_status || "PENDING"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-[var(--fg-subtle)] font-bold">Gate Admission</span>
                          <p className={`font-bold ${isAll ? "text-green-400" : checkedIn > 0 ? "text-amber-400" : "text-[var(--fg-muted)]"}`}>
                            {checkedIn} / {bQty} Checked in
                          </p>
                          {tix.length > 0 && (
                            <p className="font-mono text-[10px] text-[var(--brand)] truncate">
                              Pass Ref: {tix[0]?.ticket_ref}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--fg-muted)] py-2">
                No event tickets have been booked by this user yet.
              </p>
            )}
          </Panel>

          {data?.summary && (
            <Panel title="Profile summary" className="shadow-none">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--surface-2)] p-3 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
                {JSON.stringify(data.summary, null, 2)}
              </pre>
            </Panel>
          )}
        </div>
      )}
    </Modal>
  );
}
