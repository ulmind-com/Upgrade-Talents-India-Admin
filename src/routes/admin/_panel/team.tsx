import { createFileRoute } from "@tanstack/react-router";
import { ControlCenterPage } from "@/admin/pages/ControlCenterPage";
export const Route = createFileRoute("/admin/_panel/team")({ head: () => ({ meta: [{ title: "Judges & Volunteers — Upgrade Talents India Admin" }, { name: "description", content: "Manage Upgrade Talents India operational teams." }, { property: "og:title", content: "Judges & Volunteers — Upgrade Talents India Admin" }, { property: "og:description", content: "Manage Upgrade Talents India operational teams." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: () => <ControlCenterPage module="team" title="Judges & volunteers"/>
});
