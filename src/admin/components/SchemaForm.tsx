import type { ReactNode } from "react";
import { fieldCls } from "./ui";

export type FieldSchema = { type?: string; title?: string; enum?: (string | number)[]; default?: unknown; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; format?: string; required?: string[]; properties?: Record<string, FieldSchema>; items?: FieldSchema };

export function SchemaFields({ schema, prefix = "", value = {} }: { schema: FieldSchema; prefix?: string; value?: Record<string, unknown> }): ReactNode {
  return Object.entries(schema.properties ?? {}).map(([key, field]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    const required = schema.required?.includes(key) ?? false;
    const label = field.title ?? key.replaceAll("_", " ");
    const initial = value[key] ?? field.default;
    if (field.type === "object" && field.properties) return <fieldset key={name} className="sm:col-span-2"><legend className="mb-3 font-semibold">{label}</legend><div className="grid gap-4 sm:grid-cols-2"><SchemaFields schema={field} prefix={name} value={initial && typeof initial === "object" ? initial as Record<string, unknown> : {}}/></div></fieldset>;
    if (field.type === "boolean") return <label key={name} className="flex items-center gap-3 text-sm"><input name={name} type="checkbox" defaultChecked={initial === true} className="h-4 w-4"/>{label}</label>;
    if (field.type === "array") return <label key={name} className="block text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">{label}{required && " *"}</span><textarea name={name} required={required} defaultValue={JSON.stringify(initial ?? [])} rows={4} className={fieldCls} aria-describedby={`${name}-hint`}/><small id={`${name}-hint`} className="text-muted-foreground">{field.items?.type === "object" ? "Enter a list of records." : "Enter a list of values."}</small></label>;
    return <label key={name} className="block min-w-0 text-sm"><span className="mb-1.5 block font-medium">{label}{required && " *"}</span>{field.enum ? <select name={name} defaultValue={String(initial ?? field.enum[0])} className={fieldCls} required={required}>{field.enum.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type === "string" && /description|message|content|rules|bio/.test(key) ? <textarea name={name} defaultValue={String(initial ?? "")} rows={3} required={required} className={fieldCls}/> : <input name={name} defaultValue={String(initial ?? "")} type={field.type === "integer" || field.type === "number" ? "number" : field.format === "email" ? "email" : field.format === "binary" ? "file" : "text"} step={field.type === "number" ? "any" : undefined} min={field.minimum} max={field.maximum} minLength={field.minLength} maxLength={field.maxLength} required={required} className={fieldCls}/>}</label>;
  });
}

export function parseSchemaForm(schema: FieldSchema, form: FormData, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.properties ?? {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (field.type === "object" && field.properties) { result[key] = parseSchemaForm(field, form, name); continue; }
    if (field.type === "boolean") { result[key] = form.has(name); continue; }
    const raw = form.get(name);
    if (raw === null || raw === "") continue;
    result[key] = field.type === "array" ? JSON.parse(String(raw)) : field.type === "integer" || field.type === "number" ? Number(raw) : raw;
  }
  return result;
}