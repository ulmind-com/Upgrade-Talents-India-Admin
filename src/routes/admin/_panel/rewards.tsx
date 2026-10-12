import { createFileRoute } from "@tanstack/react-router";
import { ControlCenterPage } from "@/admin/pages/ControlCenterPage";
export const Route = createFileRoute("/admin/_panel/rewards")({ head: () => ({ meta: [{ title: "Rewards & Awards — Upgrade Talents India Admin" }, { name: "description", content: "Manage rewards, certificates and badges." }, { property: "og:title", content: "Rewards & Awards — Upgrade Talents India Admin" }, { property: "og:description", content: "Manage rewards, certificates and badges." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: () => <ControlCenterPage module="rewards" title="Rewards & awards"/>
});
