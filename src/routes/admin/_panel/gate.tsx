import { createFileRoute } from "@tanstack/react-router";
import { GatePage } from "@/admin/pages/GatePage";

export const Route = createFileRoute("/admin/_panel/gate")({
  head: () => ({ meta: [{ title: "Gate check-in — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Gate check-in — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <GatePage />,
});
