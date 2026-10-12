import { createFileRoute } from "@tanstack/react-router";
import { EventsAdminPage } from "@/admin/pages/EventsAdminPage";

export const Route = createFileRoute("/admin/_panel/events")({
  head: () => ({ meta: [{ title: "Events — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Events — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <EventsAdminPage />,
});
