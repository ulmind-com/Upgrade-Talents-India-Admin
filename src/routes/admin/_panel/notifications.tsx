import { createFileRoute } from "@tanstack/react-router";
import { ControlCenterPage } from "@/admin/pages/ControlCenterPage";
export const Route = createFileRoute("/admin/_panel/notifications")({ head: () => ({ meta: [{ title: "Notifications — Upgrade Talents India Admin" }, { name: "description", content: "Create and publish Upgrade Talents India announcements." }, { property: "og:title", content: "Notifications — Upgrade Talents India Admin" }, { property: "og:description", content: "Create and publish Upgrade Talents India announcements." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: () => <ControlCenterPage module="notifications" title="Notifications"/>
});
