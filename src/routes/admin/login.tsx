import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@/admin/pages/AdminLoginPage";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Sign in — Upgrade Talents India Admin" }, { name: "description", content: "Upgrade Talents India operations console." }, { property: "og:title", content: "Sign in — Upgrade Talents India Admin" }, { property: "og:description", content: "Upgrade Talents India operations console." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: AdminLoginPage,
});
