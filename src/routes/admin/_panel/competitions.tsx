import { createFileRoute } from "@tanstack/react-router";
import { ControlCenterPage } from "@/admin/pages/ControlCenterPage";
export const Route = createFileRoute("/admin/_panel/competitions")({ head: () => ({ meta: [{ title: "Competitions — Upgrade Talents India Admin" }, { name: "description", content: "Manage Upgrade Talents India competitions and results." }, { property: "og:title", content: "Competitions — Upgrade Talents India Admin" }, { property: "og:description", content: "Manage Upgrade Talents India competitions and results." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: () => <ControlCenterPage module="competitions" title="Competitions"/>
});
