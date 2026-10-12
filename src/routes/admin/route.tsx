import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: () => (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  ),
});
