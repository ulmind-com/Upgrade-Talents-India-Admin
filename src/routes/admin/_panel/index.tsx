import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/admin/pages/DashboardPage";

export const Route = createFileRoute("/admin/_panel/")({
  head: () => ({ meta: [{ title: "Overview — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Overview — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <DashboardPage />,
});
