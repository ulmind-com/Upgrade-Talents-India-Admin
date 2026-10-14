"use client";

import { Send, Ban } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, StatusBadge, useConfirm } from "@/components/Kit";
import { useToast } from "@/components/Providers";
import { notificationsApi } from "@/lib/api";
import { formatDate, rowId } from "@/lib/utils";

export default function NotificationsPage() {
  const { push } = useToast();
  const { confirm, dialog } = useConfirm();

  const publish = async (row: any, reload: () => void) => {
    const ok = await confirm("Send this announcement?", "It will be delivered to every targeted user immediately.", false);
    if (!ok) return;
    try { await notificationsApi.publish(rowId(row)); push("success", "Announcement sent."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not send."); }
  };

  const cancel = async (row: any, reload: () => void) => {
    try { await notificationsApi.cancel(rowId(row)); push("success", "Announcement cancelled."); reload(); }
    catch (e: any) { push("error", e?.message || "Could not cancel."); }
  };

  return (
    <>
      <CrudPage
        config={{
          title: "Announcements",
          singular: "Announcement",
          subtitle: "Push messages to users across the website and app",
          emptyBody: "Draft an announcement, preview it, then send.",
          load: () => notificationsApi.list({ limit: 100 }),
          create: (b) => notificationsApi.create(b),
          update: (id, b) => notificationsApi.update(id, b),
          searchKeys: ["title", "message"],
          columns: [
            { key: "title", header: "Announcement", render: (r: any) => (
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.title || "Untitled"}</p>
                <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{r.message || r.body}</p>
              </div>
            ) },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
            { key: "scheduled_at", header: "Scheduled", render: (r: any) => formatDate(r.scheduled_at, true) },
            { key: "created_at", header: "Created", render: (r: any) => formatDate(r.created_at, true) },
          ],
          rowActions: (row: any, { reload }: any) => (
            <>
              {row.status !== "published" && row.status !== "sent" && (
                <Button size="sm" variant="success" onClick={() => publish(row, reload)}><Send className="size-3.5" aria-hidden /> Send</Button>
              )}
              {row.status === "scheduled" && (
                <Button size="sm" variant="secondary" onClick={() => cancel(row, reload)}><Ban className="size-3.5" aria-hidden /> Cancel</Button>
              )}
            </>
          ),
          fields: [
            { name: "title", label: "Title", required: true },
            { name: "message", label: "Message", type: "textarea", required: true },
            { name: "notification_type", label: "Type", type: "select", half: true, defaultValue: "ANNOUNCEMENT",
              options: ["ANNOUNCEMENT", "EVENT_REMINDER", "VOTING_REMINDER", "LEADERBOARD_UPDATE", "COMPETITION_RESULT"].map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
            { name: "priority", label: "Priority", type: "select", half: true, defaultValue: "NORMAL",
              options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => ({ value: v, label: v })) },
            { name: "action_url", label: "Action link", half: true, placeholder: "/events/abc123" },
            { name: "scheduled_at", label: "Schedule for", type: "datetime", half: true, hint: "Leave blank to send manually." },
          ],
          toBody: (v) => ({
            title: v.title,
            message: v.message,
            notification_type: v.notification_type,
            priority: v.priority,
            action_url: v.action_url || null,
            scheduled_at: v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null,
          }),
        }}
      />
      {dialog}
    </>
  );
}
