"use client";

import { useState } from "react";
import { Archive, Eye, Package, ShoppingBag, TrendingUp, Boxes } from "lucide-react";
import { CrudPage } from "@/components/Crud";
import { Button, DataTable, Panel, Select, StatusBadge, useResource } from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { merchApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

const ORDER_STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function MerchandisePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"products" | "orders" | "inventory">("products");

  const { data: stats } = useResource(async () => ({
    analytics: await safe(merchApi.analytics(), null),
    orders: await safe(merchApi.listOrders({ limit: 200 }), []),
  }), []);

  const orders = toRows(stats?.orders);
  const a = stats?.analytics || {};
  const revenue = a.total_revenue ?? orders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={formatNumber(a.total_orders ?? orders.length)} Icon={ShoppingBag} accent index={0} />
        <StatCard label="Revenue" value={formatINR(revenue)} Icon={TrendingUp} index={1} />
        <StatCard label="Products" value={formatNumber(a.total_products ?? 0)} Icon={Package} index={2} />
        <StatCard label="Low stock items" value={formatNumber(a.low_stock_count ?? 0)} Icon={Boxes} index={3} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([["products", "Products"], ["orders", "Orders"], ["inventory", "Inventory"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
              tab === k ? "bg-[var(--brand)] text-[var(--on-brand)]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <CrudPage
          config={{
            title: "Products",
            singular: "Product",
            subtitle: "Event merchandise sold through the website",
            emptyBody: "Add a product to start selling merchandise.",
            load: () => merchApi.listProducts({ limit: 100 }),
            create: (b) => merchApi.createProduct(b),
            update: (id, b) => merchApi.updateProduct(id, b),
            searchKeys: ["name", "sku"],
            columns: [
              { key: "name", header: "Product", render: (r: any) => (
                <div className="flex items-center gap-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]"><Package className="size-4 text-[var(--fg-muted)]" aria-hidden /></span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block truncate font-mono text-[11px] text-[var(--fg-muted)]">{r.sku || "—"}</span>
                  </span>
                </div>
              ) },
              { key: "price", header: "Price", render: (r: any) => formatINR(r.price) },
              { key: "stock", header: "Stock", render: (r: any) => (
                <span className={Number(r.stock ?? r.quantity) <= 5 ? "font-semibold text-[var(--danger)]" : ""}>{r.stock ?? r.quantity ?? "—"}</span>
              ) },
              { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
            ],
            rowActions: (row: any, { reload }: any) => (
              <>
                {row.status !== "published" && (
                  <Button size="sm" variant="success" onClick={async () => {
                    try { await merchApi.publishProduct(rowId(row)); push("success", "Product published."); reload(); }
                    catch (e: any) { push("error", e?.message || "Could not publish."); }
                  }}><Eye className="size-3.5" aria-hidden /> Publish</Button>
                )}
                {row.status !== "archived" && (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    try { await merchApi.archiveProduct(rowId(row)); push("success", "Product archived."); reload(); }
                    catch (e: any) { push("error", e?.message || "Could not archive."); }
                  }}><Archive className="size-3.5" aria-hidden /> Archive</Button>
                )}
              </>
            ),
            fields: [
              { name: "name", label: "Product name", required: true },
              { name: "description", label: "Description", type: "textarea" },
              { name: "sku", label: "SKU", half: true },
              { name: "price", label: "Price (₹)", type: "number", required: true, half: true, defaultValue: 0 },
              { name: "stock", label: "Stock quantity", type: "number", required: true, half: true, defaultValue: 0 },
              { name: "category", label: "Category", half: true, placeholder: "Apparel / Accessories" },
              { name: "image_url", label: "Image URL", type: "url" },
            ],
            toBody: (v) => ({
              name: v.name,
              description: v.description || null,
              sku: v.sku || null,
              price: Number(v.price) || 0,
              stock: Number(v.stock) || 0,
              category: v.category || null,
              image_url: v.image_url || null,
            }),
          }}
        />
      )}

      {tab === "orders" && <OrdersTable />}
      {tab === "inventory" && <InventoryTable />}
    </div>
  );
}

function OrdersTable() {
  const { push } = useToast();
  const { data, loading, error, reload } = useResource(() => merchApi.listOrders({ limit: 200 }), []);
  const rows = toRows(data);

  const setStatus = async (row: any, status: string) => {
    try { await merchApi.setOrderStatus(rowId(row), { status }); push("success", `Order marked ${status.toLowerCase()}.`); reload(); }
    catch (e: any) { push("error", e?.message || "Could not update the order."); }
  };

  return (
    <Panel title="Orders" subtitle="Merchandise purchases and fulfilment status">
      <DataTable
        rows={rows} loading={loading} error={error} onRetry={reload}
        searchKeys={["order_reference", "user_email", "status"]}
        empty={{ title: "No orders yet" }}
        columns={[
          { key: "order_reference", header: "Order", render: (r: any) => <span className="font-mono text-[12px]">{r.order_reference || rowId(r)}</span> },
          { key: "user_email", header: "Customer", render: (r: any) => r.user_email || "—" },
          { key: "total_amount", header: "Total", render: (r: any) => formatINR(r.total_amount) },
          { key: "created_at", header: "Placed", render: (r: any) => formatDate(r.created_at, true) },
          { key: "status", header: "Status", render: (r: any) => <StatusBadge value={r.status} /> },
          { key: "__a", header: "Update", className: "text-right", render: (r: any) => (
            <div className="flex justify-end">
              <label htmlFor={`st-${rowId(r)}`} className="sr-only">Order status</label>
              <Select
                id={`st-${rowId(r)}`}
                value={String(r.status || "PENDING").toUpperCase()}
                onChange={(e) => setStatus(r, e.target.value)}
                options={ORDER_STATUSES.map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() }))}
                className="h-9 w-[150px] text-[12px]"
              />
            </div>
          ) },
        ]}
      />
    </Panel>
  );
}

function InventoryTable() {
  const { data, loading, error, reload } = useResource(() => merchApi.inventory({ limit: 200 }), []);
  const rows = toRows(data);

  return (
    <Panel title="Inventory" subtitle="Stock levels across all products">
      <DataTable
        rows={rows} loading={loading} error={error} onRetry={reload}
        searchKeys={["name", "sku"]}
        empty={{ title: "No inventory records" }}
        columns={[
          { key: "name", header: "Product", render: (r: any) => r.name || r.product_name || "—" },
          { key: "sku", header: "SKU", render: (r: any) => <span className="font-mono text-[12px]">{r.sku || "—"}</span> },
          { key: "stock", header: "On hand", render: (r: any) => (
            <span className={Number(r.stock ?? r.quantity) <= 5 ? "font-semibold text-[var(--danger)]" : ""}>{r.stock ?? r.quantity ?? 0}</span>
          ) },
          { key: "reserved", header: "Reserved", render: (r: any) => r.reserved ?? 0 },
          { key: "updated_at", header: "Updated", render: (r: any) => formatDate(r.updated_at, true) },
        ]}
      />
    </Panel>
  );
}
