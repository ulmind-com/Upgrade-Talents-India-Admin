import { createFileRoute } from "@tanstack/react-router";
import { VipPage } from "@/admin/pages/VipPage";

export const Route = createFileRoute("/admin/_panel/checkins")({
  head: () => ({ meta: [{ title: "Check-in history — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Check-in history — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <VipPage historyOnly />,
});
