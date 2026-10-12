import { useQuery } from "@tanstack/react-query";
import { idOf } from "@/shared/api";
import { str } from "@/shared/format";
import { adminApi } from "../api";
import { fieldCls } from "./ui";

export function EventPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({ queryKey: ["admin-events"], queryFn: adminApi.events });
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
      <option value="">Select an event…</option>
      {data?.map((e) => <option key={idOf(e)} value={idOf(e)}>{str(e.title, "Untitled")} · {str(e.date)}</option>)}
    </select>
  );
}
