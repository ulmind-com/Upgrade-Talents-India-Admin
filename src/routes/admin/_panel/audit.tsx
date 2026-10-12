import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/admin/pages/ResourcePage";

export const Route = createFileRoute("/admin/_panel/audit")({
  head: () => ({ meta: [{ title: "Audit logs — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Audit logs — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <ResourcePage title="Audit logs" sub="Who changed what" resources={[{ key: "a", label: "Logs", path: "/api/admin/audit-logs" }]} />,
});
