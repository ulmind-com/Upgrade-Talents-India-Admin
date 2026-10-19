"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  Archive, Eye, Package, ShoppingBag, TrendingUp, Boxes,
  Plus, Edit3, Truck, Search, AlertCircle, CheckCircle2,
  X, UploadCloud, RefreshCw, ChevronRight, Copy, Check,
  ArrowUpRight, ShieldCheck, MapPin, Phone, Mail, Clock,
  DollarSign, Layers, Tag, CreditCard
} from "lucide-react";
import { Button, DataTable, Panel, Select, StatusBadge, Modal, Field, Input, useResource } from "@/components/Kit";
import { StatCard } from "@/components/Dash";
import { useToast } from "@/components/Providers";
import { merchApi, safe, toRows } from "@/lib/api";
import { formatDate, formatINR, formatNumber, rowId } from "@/lib/utils";

const MERCH_CATEGORIES = [
  "T-shirts", "Hoodies", "Caps", "Mugs", "Bags", "Badges", "Posters", "Accessories", "Custom"
];

const ORDER_FULFILLMENT_STATUSES = [
  { value: "CONFIRMED", label: "Confirmed (Payment Verified)" },
  { value: "PROCESSING", label: "Processing (Preparing Order)" },
  { value: "PACKED", label: "Packed (Ready for Courier)" },
  { value: "SHIPPED", label: "Shipped (In Transit)" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered (Completed)" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUND_PENDING", label: "Refund Pending" },
  { value: "REFUNDED", label: "Refunded" },
];

export default function MerchandisePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"products" | "orders" | "inventory">("products");

  // Load analytics & initial orders count
  const { data: stats, reload: reloadStats } = useResource(async () => ({
    analytics: await safe(merchApi.analytics(), null),
    orders: await safe(merchApi.listOrders({ limit: 100 }), []),
  }), []);

  const a = stats?.analytics || {};
  const orders = toRows(stats?.orders);
  const revenue = a.net_revenue ?? a.gross_revenue ?? orders.reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [fulfillmentModalOpen, setFulfillmentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [preselectedProductForAdjustment, setPreselectedProductForAdjustment] = useState<any>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Metric Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={formatNumber(a.total_orders ?? orders.length)}
          hint={a.confirmed_orders ? `${a.confirmed_orders} paid & confirmed` : undefined}
          Icon={ShoppingBag}
          accent
          index={0}
        />
        <StatCard
          label="Net Sales Revenue"
          value={formatINR(revenue)}
          hint={a.units_sold ? `${a.units_sold} units sold` : undefined}
          Icon={TrendingUp}
          index={1}
        />
        <StatCard
          label="Active Products"
          value={formatNumber(a.active_products ?? a.total_products ?? 0)}
          hint={a.total_products ? `${a.total_products} total in catalog` : undefined}
          Icon={Package}
          index={2}
        />
        <StatCard
          label="Low Stock Alerts"
          value={formatNumber(a.low_stock_items?.length ?? a.low_stock_count ?? 0)}
          hint={(a.low_stock_items?.length ?? 0) > 0 ? "Requires restock" : "All healthy"}
          Icon={Boxes}
          index={3}
        />
      </div>

      {/* ── Tab Bar Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {([
            ["products", "Products Catalog"],
            ["orders", "Orders & Fulfillment"],
            ["inventory", "Inventory & Stock Levels"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`min-h-[40px] cursor-pointer rounded-xl px-4 text-[13px] font-semibold transition-colors ${
                tab === k
                  ? "bg-[var(--brand)] text-[var(--on-brand)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <Button
            onClick={() => {
              setEditingProduct(null);
              setProductModalOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Product
          </Button>
        )}

        {tab === "inventory" && (
          <Button
            onClick={() => {
              setPreselectedProductForAdjustment(null);
              setAdjustmentModalOpen(true);
            }}
          >
            <Boxes className="size-4" /> Adjust Stock Quantity
          </Button>
        )}
      </div>

      {/* ── Tab Views ── */}
      {tab === "products" && (
        <ProductsManager
          onEdit={(prod) => {
            setEditingProduct(prod);
            setProductModalOpen(true);
          }}
          onAdjustStock={(prod) => {
            setPreselectedProductForAdjustment(prod);
            setAdjustmentModalOpen(true);
          }}
          onReloadStats={reloadStats}
        />
      )}

      {tab === "orders" && (
        <OrdersManager
          onOpenFulfillment={(order) => {
            setSelectedOrder(order);
            setFulfillmentModalOpen(true);
          }}
        />
      )}

      {tab === "inventory" && (
        <InventoryManager
          analytics={a}
          onAdjustStock={(prod) => {
            setPreselectedProductForAdjustment(prod);
            setAdjustmentModalOpen(true);
          }}
        />
      )}

      {/* ── Product Create / Edit Modal ── */}
      <ProductFormModal
        open={productModalOpen}
        product={editingProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
          reloadStats();
        }}
      />

      {/* ── Order Fulfillment & Status Modal ── */}
      <OrderFulfillmentModal
        open={fulfillmentModalOpen}
        order={selectedOrder}
        onClose={() => {
          setFulfillmentModalOpen(false);
          setSelectedOrder(null);
        }}
        onSaved={() => {
          setFulfillmentModalOpen(false);
          setSelectedOrder(null);
          reloadStats();
        }}
      />

      {/* ── Stock Adjustment Modal ── */}
      <StockAdjustmentModal
        open={adjustmentModalOpen}
        preselectedProduct={preselectedProductForAdjustment}
        onClose={() => {
          setAdjustmentModalOpen(false);
          setPreselectedProductForAdjustment(null);
        }}
        onSaved={() => {
          setAdjustmentModalOpen(false);
          setPreselectedProductForAdjustment(null);
          reloadStats();
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. PRODUCTS MANAGER
   ═══════════════════════════════════════════════════════════════════ */

function ProductsManager({
  onEdit,
  onAdjustStock,
  onReloadStats,
}: {
  onEdit: (prod: any) => void;
  onAdjustStock: (prod: any) => void;
  onReloadStats: () => void;
}) {
  const { push } = useToast();
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const { data, loading, error, reload } = useResource(
    () => merchApi.listProducts({ limit: 100 }),
    []
  );

  const rawRows = toRows(data);

  const filteredRows = useMemo(() => {
    return rawRows.filter((p: any) => {
      const matchCat = selectedCat === "ALL" || p.category === selectedCat;
      const matchSearch =
        !search ||
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [rawRows, selectedCat, search]);

  const handlePublish = async (prod: any) => {
    try {
      await merchApi.publishProduct(rowId(prod));
      push("success", `"${prod.name}" published.`);
      reload();
      onReloadStats();
    } catch (e: any) {
      push("error", e?.message || "Could not publish product.");
    }
  };

  const handleArchive = async (prod: any) => {
    try {
      await merchApi.archiveProduct(rowId(prod));
      push("success", `"${prod.name}" archived.`);
      reload();
      onReloadStats();
    } catch (e: any) {
      push("error", e?.message || "Could not archive product.");
    }
  };

  return (
    <Panel
      title="Merchandise Products Catalog"
      subtitle="Products, variants, live stock inventory and authoritative pricing"
      action={
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            options={[
              { value: "ALL", label: "All Categories" },
              ...MERCH_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            className="h-9 w-[160px] text-xs"
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-9 w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>
      }
    >
      <DataTable
        rows={filteredRows}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: "No products found", body: "Click 'Add Product' to list official event merchandise." }}
        columns={[
          {
            key: "product",
            header: "Product",
            render: (r: any) => {
              const img = r.images?.[0] || r.image_url || "";
              return (
                <div className="flex items-center gap-3">
                  {img ? (
                    <img src={img} alt="" className="size-11 shrink-0 rounded-lg border border-[var(--border)] object-cover" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] text-[var(--fg-muted)]">
                      <Package className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-semibold text-[13.5px] hover:text-[var(--brand)]">{r.name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                      <span className="font-mono">{r.sku || "—"}</span>
                      {r.category && <span>· {r.category}</span>}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "price",
            header: "Price",
            render: (r: any) => (
              <span className="font-semibold text-white">{formatINR(r.price)}</span>
            ),
          },
          {
            key: "stock",
            header: "Stock Quantity",
            render: (r: any) => {
              const stock = Number(r.stock_quantity ?? r.stock ?? 0);
              const reserved = Number(r.reserved_quantity ?? 0);
              const available = Math.max(0, stock - reserved);
              const isLow = available <= (r.low_stock_threshold ?? 5);

              return (
                <div className="text-xs">
                  <span className={`font-bold ${isLow ? "text-[var(--danger)]" : "text-white"}`}>
                    {available} available
                  </span>
                  <span className="block text-[11px] text-[var(--fg-subtle)]">
                    Total: {stock} {reserved > 0 ? `(${reserved} reserved)` : ""}
                  </span>
                </div>
              );
            },
          },
          {
            key: "variants",
            header: "Variants",
            render: (r: any) => {
              const vars = r.variants || [];
              if (!vars.length) return <span className="text-[11px] text-[var(--fg-subtle)]">Standard</span>;
              return (
                <span className="inline-flex rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--fg-muted)]">
                  {vars.length} variant{vars.length > 1 ? "s" : ""}
                </span>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (r: any) => <StatusBadge value={r.status} />,
          },
          {
            key: "__actions",
            header: "Actions",
            className: "text-right",
            render: (r: any) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => onEdit(r)} aria-label="Edit product details">
                  <Edit3 className="size-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onAdjustStock(r)} aria-label="Adjust stock">
                  <Boxes className="size-3.5" /> Stock
                </Button>
                {r.status !== "ACTIVE" && (
                  <Button size="sm" variant="success" onClick={() => handlePublish(r)} aria-label="Publish to website">
                    <Eye className="size-3.5" />
                  </Button>
                )}
                {r.status !== "ARCHIVED" && (
                  <Button size="sm" variant="ghost" onClick={() => handleArchive(r)} aria-label="Archive product">
                    <Archive className="size-3.5 text-[var(--danger)]" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. ORDERS & FULFILLMENT MANAGER
   ═══════════════════════════════════════════════════════════════════ */

function OrdersManager({
  onOpenFulfillment,
}: {
  onOpenFulfillment: (order: any) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const { data, loading, error, reload } = useResource(
    () => merchApi.listOrders({ limit: 150 }),
    []
  );

  const rawRows = toRows(data);

  const filteredOrders = useMemo(() => {
    return rawRows.filter((o: any) => {
      const matchStatus = statusFilter === "ALL" || (o.status || "").toUpperCase() === statusFilter;
      const matchSearch =
        !search ||
        (o.order_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.user_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.shipping_address?.full_name || "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [rawRows, statusFilter, search]);

  return (
    <Panel
      title="Merchandise Purchases & Fulfillment"
      subtitle="Track customer orders, update tracking numbers, and manage shipment milestones"
      action={
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ALL", label: "All Statuses" },
              ...ORDER_FULFILLMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            className="h-9 w-[190px] text-xs"
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order # or email..."
              className="h-9 w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>
        </div>
      }
    >
      <DataTable
        rows={filteredOrders}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: "No orders found", body: "Merchandise purchases placed via the shop will display here." }}
        columns={[
          {
            key: "order_number",
            header: "Order #",
            render: (r: any) => (
              <div>
                <span className="font-mono text-xs font-bold text-[var(--brand)]">
                  #{r.order_number || rowId(r)}
                </span>
                <span className="block text-[11px] text-[var(--fg-subtle)]">
                  {formatDate(r.created_at, true)}
                </span>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer & Destination",
            render: (r: any) => (
              <div className="text-xs">
                <span className="font-semibold text-white">
                  {r.shipping_address?.full_name || r.user_name || "Customer"}
                </span>
                <span className="block font-mono text-[11px] text-[var(--fg-muted)] truncate max-w-[200px]">
                  {r.user_email}
                </span>
                {r.shipping_address?.city && (
                  <span className="text-[11px] text-[var(--fg-subtle)]">
                    {r.shipping_address.city}, {r.shipping_address.state}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "items",
            header: "Items",
            render: (r: any) => {
              const items = r.items || [];
              const count = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
              const previewNames = items.slice(0, 2).map((i: any) => i.product_name || "Item").join(", ");
              return (
                <div className="text-xs">
                  <span className="font-semibold text-white">{count} item{count > 1 ? "s" : ""}</span>
                  <span className="block text-[11px] text-[var(--fg-muted)] truncate max-w-[220px]">
                    {previewNames}{items.length > 2 ? ` +${items.length - 2} more` : ""}
                  </span>
                </div>
              );
            },
          },
          {
            key: "total_amount",
            header: "Total",
            render: (r: any) => (
              <div>
                <span className="font-semibold text-white">{formatINR(r.total_amount)}</span>
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${r.payment_status === "PAID" ? "text-green-400" : "text-amber-400"}`}>
                  {r.payment_status || "PENDING"}
                </span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Fulfillment",
            render: (r: any) => <StatusBadge value={r.status} />,
          },
          {
            key: "courier",
            header: "Courier / Tracking",
            render: (r: any) => (
              <div className="text-xs font-mono">
                {r.tracking_number ? (
                  <div>
                    <span className="text-white font-semibold">{r.courier_name || "Courier"}:</span>
                    <span className="block text-[11px] text-[var(--brand)]">{r.tracking_number}</span>
                  </div>
                ) : (
                  <span className="text-[var(--fg-subtle)] text-[11px]">Unassigned</span>
                )}
              </div>
            ),
          },
          {
            key: "__actions",
            header: "Manage",
            className: "text-right",
            render: (r: any) => (
              <Button size="sm" variant="secondary" onClick={() => onOpenFulfillment(r)}>
                <Truck className="size-3.5" /> Fulfill
              </Button>
            ),
          },
        ]}
      />
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. INVENTORY & STOCK LEVELS
   ═══════════════════════════════════════════════════════════════════ */

function InventoryManager({
  analytics,
  onAdjustStock,
}: {
  analytics: any;
  onAdjustStock: (prod?: any) => void;
}) {
  const { data, loading, error, reload } = useResource(
    () => merchApi.listProducts({ limit: 150 }),
    []
  );

  const rawRows = toRows(data);
  const lowStockItems = analytics?.low_stock_items || [];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Low Stock Alert Banner ── */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-amber-400">
            <AlertCircle className="size-4.5" /> Attention: {lowStockItems.length} Products Low On Stock
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-3 border border-amber-500/20">
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-amber-400 font-mono">
                    Only {item.available_stock} remaining (Threshold: {item.threshold})
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onAdjustStock(item)}>
                  Restock
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inventory Table ── */}
      <Panel
        title="Inventory Stock Tracker"
        subtitle="On-hand stock, reserved checkout items, and threshold triggers"
        action={
          <Button size="sm" onClick={() => onAdjustStock(null)}>
            <Boxes className="size-3.5" /> Adjust Stock Quantity
          </Button>
        }
      >
        <DataTable
          rows={rawRows}
          loading={loading}
          error={error}
          onRetry={reload}
          columns={[
            {
              key: "name",
              header: "Product & SKU",
              render: (r: any) => (
                <div>
                  <span className="font-semibold text-white text-[13px]">{r.name}</span>
                  <span className="block font-mono text-[11px] text-[var(--fg-muted)]">{r.sku || "—"}</span>
                </div>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (r: any) => (
                <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                  {r.category || "General"}
                </span>
              ),
            },
            {
              key: "total_stock",
              header: "Total On-Hand",
              render: (r: any) => (
                <span className="font-mono text-xs font-semibold text-white">
                  {r.stock_quantity ?? r.stock ?? 0}
                </span>
              ),
            },
            {
              key: "reserved",
              header: "Reserved (Checkout)",
              render: (r: any) => (
                <span className="font-mono text-xs text-amber-400">
                  {r.reserved_quantity ?? 0}
                </span>
              ),
            },
            {
              key: "available",
              header: "Available for Sale",
              render: (r: any) => {
                const stock = Number(r.stock_quantity ?? r.stock ?? 0);
                const reserved = Number(r.reserved_quantity ?? 0);
                const avail = Math.max(0, stock - reserved);
                const isLow = avail <= (r.low_stock_threshold ?? 5);

                return (
                  <span className={`font-mono text-xs font-bold ${isLow ? "text-[var(--danger)]" : "text-green-400"}`}>
                    {avail} {isLow ? "(LOW)" : ""}
                  </span>
                );
              },
            },
            {
              key: "threshold",
              header: "Low Stock Alert At",
              render: (r: any) => (
                <span className="font-mono text-xs text-[var(--fg-subtle)]">
                  ≤ {r.low_stock_threshold ?? 5} units
                </span>
              ),
            },
            {
              key: "__actions",
              header: "Actions",
              className: "text-right",
              render: (r: any) => (
                <Button size="sm" variant="secondary" onClick={() => onAdjustStock(r)}>
                  <Boxes className="size-3.5" /> Adjust
                </Button>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. PRODUCT CREATE / EDIT MODAL
   ═══════════════════════════════════════════════════════════════════ */

function ProductFormModal({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("T-shirts");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(499);
  const [stockQuantity, setStockQuantity] = useState<number>(50);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  // Variants builder
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCategory(product.category || "T-shirts");
      setDescription(product.description || "");
      setSku(product.sku || "");
      setPrice(Number(product.price || 499));
      setStockQuantity(Number(product.stock_quantity ?? product.stock ?? 50));
      setShippingFee(Number(product.shipping_fee || 0));
      setLowStockThreshold(Number(product.low_stock_threshold || 5));
      setImages(product.images || (product.image_url ? [product.image_url] : []));
      setStatus(product.status || "ACTIVE");
      setVariants(product.variants || []);
    } else {
      setName("");
      setCategory("T-shirts");
      setDescription("");
      setSku("");
      setPrice(499);
      setStockQuantity(50);
      setShippingFee(0);
      setLowStockThreshold(5);
      setImages([]);
      setImageUrlInput("");
      setStatus("ACTIVE");
      setVariants([
        { variant_id: "var-s", size: "S", color: "Black", sku: "", stock_quantity: 15, is_active: true },
        { variant_id: "var-m", size: "M", color: "Black", sku: "", stock_quantity: 20, is_active: true },
        { variant_id: "var-l", size: "L", color: "Black", sku: "", stock_quantity: 15, is_active: true },
      ]);
    }
  }, [product, open]);

  // Handle image upload to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await merchApi.uploadImage(formData);
      if (res?.url) {
        setImages((prev) => [...prev, res.url]);
        push("success", "Image uploaded successfully.");
      }
    } catch (err: any) {
      push("error", err?.message || "Failed to upload image to cloud storage.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput("");
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Variants handlers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        variant_id: `var-${Date.now()}`,
        size: "M",
        color: "Black",
        sku: "",
        stock_quantity: 10,
        is_active: true,
      },
    ]);
  };

  const handleUpdateVariant = (idx: number, field: string, val: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      push("error", "Product name is required.");
      return;
    }
    if (price <= 0) {
      push("error", "Price must be strictly positive (> 0). Free merchandise is prohibited.");
      return;
    }

    // If variants exist, sum their stocks
    const totalStock = variants.length
      ? variants.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0)
      : stockQuantity;

    const payload: any = {
      name: name.trim(),
      category,
      description: description.trim(),
      sku: sku.trim() || undefined,
      price: Number(price),
      stock_quantity: Number(totalStock),
      shipping_fee: Number(shippingFee),
      low_stock_threshold: Number(lowStockThreshold),
      images,
      status,
      variants: variants.map((v) => ({
        variant_id: v.variant_id || `var-${Math.random().toString(36).substring(7)}`,
        sku: v.sku || `${sku || "MCH"}-${v.size || "STD"}-${v.color || "DEF"}`.toUpperCase(),
        size: v.size || undefined,
        color: v.color || undefined,
        stock_quantity: Number(v.stock_quantity) || 0,
        price_override: v.price_override ? Number(v.price_override) : undefined,
        is_active: v.is_active !== false,
      })),
    };

    setBusy(true);
    try {
      if (product) {
        await merchApi.updateProduct(rowId(product), payload);
        push("success", "Product updated successfully.");
      } else {
        await merchApi.createProduct(payload);
        push("success", "Product created and listed in store.");
      }
      onSaved();
    } catch (err: any) {
      push("error", err?.message || "Failed to save product.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={product ? `Edit Product: ${product.name}` : "Create Merchandise Product"}
      subtitle="Authoritative catalog entry for official event merchandise"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} loading={busy}>
            {product ? "Update Product" : "Save & Publish"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
        {/* Row 1: Name & Category */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product Name" required>
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Heavyweight Oversized Tour Hoodie"
                required
              />
            )}
          </Field>
          <Field label="Category" required>
            {({ id }) => (
              <Select
                id={id}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={MERCH_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            )}
          </Field>
        </div>

        {/* Row 2: Price, Shipping Fee & Base Stock */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Base Price (₹)" hint="Strictly > ₹0" required>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            )}
          </Field>
          <Field label="Shipping Fee (₹)" hint="0 for Free Delivery">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min="0"
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Low Stock Alert Threshold">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              />
            )}
          </Field>
        </div>

        {/* Description & SKU */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product SKU (Optional)">
            {({ id }) => (
              <Input
                id={id}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., MCH-HOOD-BLK-01"
              />
            )}
          </Field>
          <Field label="Catalog Status">
            {({ id }) => (
              <Select
                id={id}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "ACTIVE", label: "ACTIVE (Visible & Purchasable)" },
                  { value: "DRAFT", label: "DRAFT (Hidden from Shop)" },
                  { value: "ARCHIVED", label: "ARCHIVED (Discontinued)" },
                ]}
              />
            )}
          </Field>
        </div>

        <Field label="Description">
          {({ id }) => (
            <textarea
              id={id}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Material, fit, washing instructions, and tour details..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          )}
        </Field>

        {/* Images Upload & Gallery */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Product Images ({images.length})</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="size-3.5" /> Upload to Cloud
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Or paste external image URL..."
              className="h-9 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--brand)]"
            />
            <Button type="button" size="sm" variant="ghost" onClick={handleAddImageUrl}>
              Add URL
            </Button>
          </div>

          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {images.map((img, i) => (
                <div key={i} className="group relative size-16 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <img src={img} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants Builder */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white">Product Variants</span>
              <p className="text-[11px] text-[var(--fg-subtle)]">Sizes, colors, and specific variant inventory quantities</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddVariant}>
              <Plus className="size-3.5" /> Add Variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
              <span className="text-[var(--fg-muted)]">No variants configured. Total product stock:</span>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="h-8 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-xs outline-none"
              />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface)] p-2.5">
                  <input
                    type="text"
                    value={v.size || ""}
                    onChange={(e) => handleUpdateVariant(idx, "size", e.target.value)}
                    placeholder="Size (e.g. M)"
                    className="h-8 w-20 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs"
                  />
                  <input
                    type="text"
                    value={v.color || ""}
                    onChange={(e) => handleUpdateVariant(idx, "color", e.target.value)}
                    placeholder="Color (e.g. Black)"
                    className="h-8 w-24 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs"
                  />
                  <div className="flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
                    <span>Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={v.stock_quantity ?? 0}
                      onChange={(e) => handleUpdateVariant(idx, "stock_quantity", Number(e.target.value))}
                      className="h-8 w-16 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="ml-auto text-[var(--fg-subtle)] hover:text-red-400 p-1"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. ORDER FULFILLMENT & TRACKING MODAL
   ═══════════════════════════════════════════════════════════════════ */

function OrderFulfillmentModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [fulfillmentStatus, setFulfillmentStatus] = useState("CONFIRMED");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (order) {
      setFulfillmentStatus(order.status || "CONFIRMED");
      setCourierName(order.courier_name || "");
      setTrackingNumber(order.tracking_number || "");
      setNotes("");
    }
  }, [order, open]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;

    setBusy(true);
    try {
      await merchApi.setOrderStatus(rowId(order), {
        status: fulfillmentStatus,
        courier_name: courierName.trim() || null,
        tracking_number: trackingNumber.trim() || null,
        notes: notes.trim() || null,
      });
      push("success", `Order #${order.order_number} marked as ${fulfillmentStatus}.`);
      onSaved();
    } catch (err: any) {
      push("error", err?.message || "Could not update order status.");
    } finally {
      setBusy(false);
    }
  };

  if (!order) return null;

  const items = order.items || [];
  const history = order.status_history || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Fulfill Order #${order.order_number}`}
      subtitle={`Customer: ${order.shipping_address?.full_name || order.user_email}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => handleUpdate()} loading={busy}>
            Update Fulfillment & Notify Customer
          </Button>
        </>
      }
    >
      <form onSubmit={handleUpdate} className="flex flex-col gap-6 text-xs">
        {/* Order Quick Overview */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Customer & Shipping */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
            <span className="flex items-center gap-1.5 font-bold text-white uppercase text-[11px]">
              <MapPin className="size-3.5 text-[var(--brand)]" /> Shipping Address
            </span>
            <div className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">
              <p className="font-semibold text-white">{order.shipping_address?.full_name || order.user_name}</p>
              <p className="font-mono text-[11px] text-[var(--brand)]">{order.shipping_address?.phone}</p>
              <p>{[order.shipping_address?.address_line1, order.shipping_address?.address_line2].filter(Boolean).join(", ")}</p>
              <p>{[order.shipping_address?.city, order.shipping_address?.state, order.shipping_address?.postal_code].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          {/* Payment & Total */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
            <span className="flex items-center gap-1.5 font-bold text-white uppercase text-[11px]">
              <CreditCard className="size-3.5 text-[var(--brand)]" /> Payment Details
            </span>
            <div className="mt-2 space-y-1 text-xs text-[var(--fg-muted)]">
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className={`font-bold uppercase ${order.payment_status === "PAID" ? "text-green-400" : "text-amber-400"}`}>
                  {order.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-white">{formatINR(order.total_amount)}</span>
              </div>
              {order.payment_reference && (
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Txn Ref:</span>
                  <span className="text-white">{order.payment_reference}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ordered Items List */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="font-semibold text-white">Ordered Items ({items.length})</span>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {items.map((it: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 text-xs">
                <div className="min-w-0">
                  <span className="font-medium text-white">{it.product_name}</span>
                  {(it.variant?.size || it.variant?.color) && (
                    <span className="ml-2 text-[11px] text-[var(--fg-muted)]">
                      {[it.variant.color, it.variant.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">Qty: {it.quantity}</span>
                  <span className="ml-3 font-mono text-[var(--fg-muted)]">{formatINR(it.subtotal || it.unit_price * it.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status & Courier Form */}
        <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 space-y-4">
          <span className="font-bold text-sm text-white">Update Status & Dispatch Details</span>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Order Fulfillment Status" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={fulfillmentStatus}
                  onChange={(e) => setFulfillmentStatus(e.target.value)}
                  options={ORDER_FULFILLMENT_STATUSES}
                />
              )}
            </Field>

            <Field label="Courier Partner">
              {({ id }) => (
                <Input
                  id={id}
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., Blue Dart, Delhivery, DTDC"
                />
              )}
            </Field>

            <Field label="AWB / Tracking Number">
              {({ id }) => (
                <Input
                  id={id}
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., AWB-98234729"
                />
              )}
            </Field>
          </div>

          <Field label="Internal or Customer Dispatch Notes">
            {({ id }) => (
              <Input
                id={id}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Dispatched via overnight express from Bangalore central facility"
              />
            )}
          </Field>
        </div>

        {/* Milestone Timeline Log */}
        {history.length > 0 && (
          <div>
            <span className="font-semibold text-white">Timeline Log</span>
            <div className="mt-2 space-y-2 border-l-2 border-[var(--border)] pl-4">
              {history.map((h: any, i: number) => (
                <div key={i} className="text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{h.status}</span>
                    <span className="text-[var(--fg-subtle)]">{formatDate(h.timestamp, true)}</span>
                    <span className="font-mono text-[10px] text-[var(--fg-subtle)]">({h.actor})</span>
                  </div>
                  {h.notes && <p className="text-[var(--fg-muted)]">{h.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   6. STOCK ADJUSTMENT AUDIT MODAL
   ═══════════════════════════════════════════════════════════════════ */

function StockAdjustmentModal({
  open,
  preselectedProduct,
  onClose,
  onSaved,
}: {
  open: boolean;
  preselectedProduct: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const { data: prodsData } = useResource(() => merchApi.listProducts({ limit: 100 }), [open]);
  const allProducts = toRows(prodsData);

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState<number>(10);
  const [reason, setReason] = useState("Restocked from manufacturer");

  useEffect(() => {
    if (preselectedProduct) {
      setProductId(rowId(preselectedProduct));
      setVariantId("");
      setQuantityDelta(10);
      setReason("Restocked inventory from supplier");
    } else if (allProducts.length && !productId) {
      setProductId(rowId(allProducts[0]));
    }
  }, [preselectedProduct, allProducts, open]);

  const activeProduct = useMemo(() => {
    return allProducts.find((p: any) => rowId(p) === productId) || preselectedProduct;
  }, [allProducts, productId, preselectedProduct]);

  const variants = activeProduct?.variants || [];

  const handleAdjust = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productId) {
      push("error", "Please select a product.");
      return;
    }
    if (!quantityDelta || quantityDelta === 0) {
      push("error", "Quantity delta cannot be zero.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      push("error", "Audit reason is required (minimum 3 characters).");
      return;
    }

    setBusy(true);
    try {
      await merchApi.adjustInventory({
        product_id: productId,
        variant_id: variantId || null,
        quantity_delta: Number(quantityDelta),
        reason: reason.trim(),
      });
      push("success", `Stock updated (${quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta} units).`);
      onSaved();
    } catch (err: any) {
      push("error", err?.message || "Stock adjustment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Physical Inventory Stock"
      subtitle="Authoritative stock adjustment with mandatory audit logging"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => handleAdjust()} loading={busy}>
            Apply Adjustment
          </Button>
        </>
      }
    >
      <form onSubmit={handleAdjust} className="flex flex-col gap-4 text-xs">
        <Field label="Select Product" required>
          {({ id }) => (
            <Select
              id={id}
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariantId("");
              }}
              options={allProducts.map((p: any) => ({
                value: rowId(p),
                label: `${p.name} (Current Stock: ${p.stock_quantity ?? p.stock ?? 0})`,
              }))}
            />
          )}
        </Field>

        {variants.length > 0 && (
          <Field label="Select Variant (Optional)">
            {({ id }) => (
              <Select
                id={id}
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                options={[
                  { value: "", label: "Entire Product (Base Stock)" },
                  ...variants.map((v: any) => ({
                    value: v.variant_id,
                    label: `Size: ${v.size || "—"} / Color: ${v.color || "—"} (Stock: ${v.stock_quantity})`,
                  })),
                ]}
              />
            )}
          </Field>
        )}

        <Field
          label="Quantity Delta"
          hint="Positive number to add stock (e.g. +50), negative to reduce (e.g. -5 for damaged/lost)"
          required
        >
          {({ id }) => (
            <Input
              id={id}
              type="number"
              value={quantityDelta}
              onChange={(e) => setQuantityDelta(Number(e.target.value))}
              required
            />
          )}
        </Field>

        <Field label="Audit Reason (Mandatory)" hint="Recorded in permanent inventory ledger" required>
          {({ id }) => (
            <Input
              id={id}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Supplier batch restock #2847, Damaged during shipping"
              required
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
