"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pencil, Trash2, Plus, Eye, Edit3, Sparkles } from "lucide-react";
import {
  Button, Column, DataTable, Field, Input, Modal, Panel, Select, Textarea, Toggle, useConfirm, useResource,
} from "./Kit";
import { useToast } from "./Providers";
import { toRows } from "@/lib/api";
import { rowId, toDateInput, toDateTimeInput, fromDateTimeInput } from "@/lib/utils";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "toggle" | "email" | "url" | "custom";
  hint?: string;
  required?: boolean;
  disabled?: boolean | ((editing: any) => boolean);
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Narrow the field to half a row on wider screens. */
  half?: boolean;
  defaultValue?: any;
  render?: (props: { value: any; onChange: (v: any) => void; error?: string }) => ReactNode;
};

export type CrudConfig<T = any> = {
  /** Loads the list; the raw payload is normalised with toRows(). */
  load: () => Promise<any>;
  create?: (body: any) => Promise<any>;
  update?: (id: string, body: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
  deleteTitle?: (row: T) => string;
  deleteBody?: (row: T) => string;
  columns: Column<T>[];
  fields?: FieldSpec[];
  searchKeys?: string[];
  title: string;
  subtitle?: string;
  singular: string;
  /** Extra per-row buttons (publish toggles, exports, etc.). */
  rowActions?: (row: T, ctx: { reload: () => void }) => ReactNode;
  /** Renders each record as a full-width card instead of a table row. The card
   *  owns its own edit / delete controls, so `rowActions` is not rendered. */
  renderCard?: (row: T, ctx: { reload: () => void; edit: () => void; remove: () => void }) => ReactNode;
  /** Buttons rendered beside the search box. */
  toolbar?: (ctx: { reload: () => void }) => ReactNode;
  /** Shapes form values into the exact request body the backend expects. */
  toBody?: (values: Record<string, any>, editing: T | null) => any;
  /** Pre-fills the form when editing. */
  toForm?: (row: T) => Record<string, any>;
  emptyBody?: string;
  pageSize?: number;
};

export function CrudPage<T extends Record<string, any>>({ config }: { config: CrudConfig<T> }) {
  const {
    load, create, update, remove, columns, fields = [], searchKeys,
    title, subtitle, singular, rowActions, toolbar, toBody, toForm, emptyBody, pageSize, renderCard,
  } = config;

  const { push } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useResource(load, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => toRows(data) as T[], [data]);

  const blank = useCallback(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      v[f.name] = f.defaultValue ?? (f.type === "toggle" ? false : f.type === "number" ? "" : "");
    });
    return v;
  }, [fields]);

  const openCreate = () => { setEditing(null); setValues(blank()); setErrors({}); setOpen(true); };

  const openEdit = (row: T) => {
    setEditing(row);
    const pre = toForm ? toForm(row) : {};
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      const raw = pre[f.name] ?? row[f.name];
      v[f.name] =
        f.type === "toggle" ? !!raw
        : f.type === "date" ? toDateInput(raw)
        : f.type === "datetime" ? toDateTimeInput(raw)
        : raw ?? "";
    });
    setValues(v);
    setErrors({});
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.required) return;
      const v = values[f.name];
      if (f.type === "toggle") return;
      if (v === "" || v === undefined || v === null) errs[f.name] = `${f.label} is required.`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = toBody
      ? toBody(values, editing)
      : Object.fromEntries(
          fields.map((f) => [
            f.name,
            f.type === "number"
              ? (values[f.name] === "" ? undefined : Number(values[f.name]))
              : f.type === "datetime"
              ? (values[f.name] ? fromDateTimeInput(values[f.name]) : null)
              : values[f.name],
          ])
        );

    setBusy(true);
    try {
      if (editing && update) {
        await update(rowId(editing), body);
        push("success", `${singular} updated.`);
      } else if (create) {
        await create(body);
        push("success", `${singular} created.`);
      }
      setOpen(false);
      reload();
    } catch (err: any) {
      push("error", err?.message || `Could not save this ${singular.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (row: T) => {
    if (!remove) return;
    const ok = await confirm(
      config.deleteTitle ? config.deleteTitle(row) : `Delete this ${singular.toLowerCase()}?`,
      config.deleteBody ? config.deleteBody(row) : "This cannot be undone from here. Make sure nothing on the live site depends on it."
    );
    if (!ok) return;
    try {
      await remove(rowId(row));
      push("success", `${singular} deleted.`);
      reload();
    } catch (err: any) {
      push("error", err?.message || "Delete failed.");
    }
  };

  const actionCol: Column<T> | null =
    !renderCard && (update || remove || rowActions)
      ? {
          key: "__actions",
          header: "Actions",
          className: "text-right",
          render: (row) => (
            <div className="flex items-center justify-end gap-1.5">
              {rowActions?.(row, { reload })}
              {update && fields.length > 0 && (
                <button
                  onClick={() => openEdit(row)}
                  aria-label={`Edit ${singular.toLowerCase()}`}
                  title={`Edit ${singular.toLowerCase()}`}
                  className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
              )}
              {remove && (
                <button
                  onClick={() => onDelete(row)}
                  aria-label={`Delete ${singular.toLowerCase()}`}
                  title={`Delete ${singular.toLowerCase()}`}
                  className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ),
        }
      : null;

  const allColumns = actionCol ? [...columns, actionCol] : columns;

  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <>
      <Panel
        title={title}
        subtitle={subtitle}
        action={
          create && fields.length > 0 ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden /> New {singular.toLowerCase()}
            </Button>
          ) : undefined
        }
      >
        <DataTable
          columns={allColumns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          searchKeys={searchKeys}
          pageSize={pageSize}
          toolbar={toolbar?.({ reload })}
          renderCard={
            renderCard
              ? (row) =>
                  renderCard(row, {
                    reload,
                    edit: () => openEdit(row),
                    remove: () => onDelete(row),
                  })
              : undefined
          }
          empty={{
            title: `No ${title.toLowerCase()} yet`,
            body: emptyBody,
            action: create && fields.length > 0
              ? <Button size="sm" onClick={openCreate}><Plus className="size-4" aria-hidden /> New {singular.toLowerCase()}</Button>
              : undefined,
          }}
        />
      </Panel>

      <Modal
        open={open}
        onClose={closeModal}
        title={editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        subtitle={editing ? "Changes go live as soon as you save." : undefined}
        wide={fields.length > 5}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => (document.getElementById("crud-form") as HTMLFormElement)?.requestSubmit()} loading={busy}>
              {editing ? "Save changes" : `Create ${singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <form id="crud-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const isDisabled = typeof f.disabled === "function" ? f.disabled(editing) : !!f.disabled;
            return (
              <div key={f.name} className={f.half ? "sm:col-span-1" : "sm:col-span-2"}>
                <FormField
                  spec={f}
                  value={values[f.name]}
                  error={errors[f.name]}
                  disabled={isDisabled}
                  onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
                />
              </div>
            );
          })}
        </form>
      </Modal>

      {dialog}
    </>
  );
}

function FormField({
  spec, value, error, onChange, disabled,
}: {
  spec: FieldSpec; value: any; error?: string; onChange: (v: any) => void; disabled?: boolean;
}) {
  if (spec.render) {
    return (
      <Field label={spec.label} hint={spec.hint} error={error} required={spec.required}>
        {() => spec.render!({ value, onChange, error })}
      </Field>
    );
  }

  if (spec.type === "toggle") {
    return <Toggle checked={!!value} onChange={onChange} label={spec.label} disabled={disabled} />;
  }

  return (
    <Field label={spec.label} hint={spec.hint} error={error} required={spec.required}>
      {({ id, describedBy, invalid }) => {
        const common = { id, "aria-describedby": describedBy, invalid, value: value ?? "", disabled };
        if (spec.type === "textarea") {
          return (
            <AdminRichTextarea
              id={id}
              value={value ?? ""}
              onChange={onChange}
              placeholder={spec.placeholder}
              invalid={invalid}
              describedBy={describedBy}
              disabled={disabled}
            />
          );
        }
        if (spec.type === "select")
          return <Select {...common} options={spec.options || []} onChange={(e) => onChange(e.target.value)} />;
        return (
          <Input
            {...common}
            type={
              spec.type === "number" ? "number"
              : spec.type === "date" ? "date"
              : spec.type === "datetime" ? "datetime-local"
              : spec.type === "email" ? "email"
              : spec.type === "url" ? "url"
              : "text"
            }
            step={spec.type === "number" ? "any" : undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder={spec.placeholder}
          />
        );
      }}
    </Field>
  );
}

function AdminRichTextarea({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const insertSnippet = (snippet: string) => {
    const current = value || "";
    onChange(current ? `${current}\n${snippet}` : snippet);
  };

  const lineCount = (value || "").split("\n").length;
  const charCount = (value || "").length;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              mode === "edit"
                ? "bg-[var(--brand)] text-[var(--on-brand)]"
                : "text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
            }`}
          >
            <Edit3 className="size-3.5" /> Editor
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              mode === "preview"
                ? "bg-[var(--brand)] text-[var(--on-brand)]"
                : "text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
            }`}
          >
            <Eye className="size-3.5" /> Website Live Preview
          </button>
        </div>

        {mode === "edit" && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[var(--fg-subtle)] hidden sm:inline">Templates:</span>
            <button
              type="button"
              onClick={() => insertSnippet("*BOLD HEADING*")}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-bold hover:border-[var(--brand)] cursor-pointer text-[var(--fg)]"
              title="Insert bold heading"
            >
              *Bold*
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("🔹 Point: Details")}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 hover:border-[var(--brand)] cursor-pointer text-[var(--fg)]"
              title="Insert bullet point"
            >
              🔹 Bullet
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("💰 *TOTAL CASH PRIZE: ₹50,000* 💰")}
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
              title="Insert prize banner"
            >
              🏆 Prize
            </button>
            <button
              type="button"
              onClick={() => insertSnippet("🗓️ *EVENT DATES:* DD Month YYYY\n📍 *VENUE:* Auditorium\n💳 *REGISTRATION FEE:* ₹0")}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 hover:border-[var(--brand)] cursor-pointer text-[var(--fg)]"
              title="Insert dates & venue"
            >
              📅 Dates
            </button>
          </div>
        )}
      </div>

      {/* Editor Mode */}
      {mode === "edit" ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-48 border-0 bg-transparent text-[13.5px] leading-relaxed resize-y focus:border-0 p-1"
          />
          <div className="flex items-center justify-between px-1 text-[11px] text-[var(--fg-subtle)]">
            <span>💡 Supports *bold*, emojis, bullet points, and clean paragraphs</span>
            <span>{charCount} chars • {lineCount} lines</span>
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="min-h-48 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs sm:text-[13px] leading-relaxed text-neutral-200">
          {value ? (
            <div className="whitespace-pre-line space-y-2">
              {value}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--fg-subtle)] text-xs">
              No description text entered yet. Switch to Editor to write.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
