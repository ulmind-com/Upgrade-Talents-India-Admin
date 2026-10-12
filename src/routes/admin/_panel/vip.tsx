import { createFileRoute } from "@tanstack/react-router";
import { VipPage } from "@/admin/pages/VipPage";

export const Route = createFileRoute("/admin/_panel/vip")({
  head: () => ({ meta: [{ title: "VIP passes — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "VIP passes — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <VipPage />,
});
