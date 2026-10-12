import { createFileRoute } from "@tanstack/react-router";
import { ControlCenterPage } from "@/admin/pages/ControlCenterPage";

export const Route = createFileRoute("/admin/_panel/users")({
  head: () => ({ meta: [{ title: "Users — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Users — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <ControlCenterPage module="users" title="Users"/>
});
