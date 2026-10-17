"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Button, Column, DataTable, Field, Input, Modal, Panel, Select, Textarea, Toggle, useConfirm, useResource,
} from "./Kit";
import { useToast } from "./Providers";
import { toRows } from "@/lib/api";
import { rowId, toDateInput, toDateTimeInput } from "@/lib/utils";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "toggle" | "email" | "url";
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Narrow the field to half a row on wider screens. */
  half?: boolean;
  defaultValue?: any;
};

export type CrudConfig<T = any> = {
  /** Loads the list; the raw payload is normalised with toRows(). */
  load: () => Promise<any>;
  create?: (body: any) => Promise<any>;
  update?: (id: string, body: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
  columns: Column<T>[];
  fields?: FieldSpec[];
  searchKeys?: string[];
  title: string;
  subtitle?: string;
  singular: string;
  /** Extra per-row buttons (publish toggles, exports, etc.). */
  rowActions?: (row: T, ctx: { reload: () => void }) => ReactNode;
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
    title, subtitle, singular, rowActions, toolbar, toBody, toForm, emptyBody, pageSize,
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
            f.type === "number" ? (values[f.name] === "" ? undefined : Number(values[f.name])) : values[f.name],
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
      `Delete this ${singular.toLowerCase()}?`,
      "This cannot be undone from here. Make sure nothing on the live site depends on it."
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
    update || remove || rowActions
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
                  className="grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--brand)]"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
              )}
              {remove && (
                <button
                  onClick={() => onDelete(row)}
                  aria-label={`Delete ${singular.toLowerCase()}`}
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
          {fields.map((f) => (
            <div key={f.name} className={f.half ? "sm:col-span-1" : "sm:col-span-2"}>
              <FormField
                spec={f}
                value={values[f.name]}
                error={errors[f.name]}
                onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
              />
            </div>
          ))}
        </form>
      </Modal>

      {dialog}
    </>
  );
}

function FormField({
  spec, value, error, onChange,
}: {
  spec: FieldSpec; value: any; error?: string; onChange: (v: any) => void;
}) {
  if (spec.type === "toggle") {
    return <Toggle checked={!!value} onChange={onChange} label={spec.label} />;
  }

  return (
    <Field label={spec.label} hint={spec.hint} error={error} required={spec.required}>
      {({ id, describedBy, invalid }) => {
        const common = { id, "aria-describedby": describedBy, invalid, value: value ?? "" };
        if (spec.type === "textarea")
          return <Textarea {...common} onChange={(e) => onChange(e.target.value)} placeholder={spec.placeholder} />;
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
