import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { idOf } from "@/shared/api";
import { fmtDate, fmtPrice, str } from "@/shared/format";
import { adminApi } from "../api";
import { btnCls, Empty, fieldCls, PageHeader, Panel, Pill } from "../components/ui";

type Ev = Record<string, unknown>;

export function EventsAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-events"], queryFn: adminApi.events });
  const [editing, setEditing] = useState<Ev | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-events"] });
  const onErr = (e: Error) => toast.error(e.message);

  const save = useMutation({
    mutationFn: (body: Ev) => (editing && idOf(editing) ? adminApi.updateEvent(idOf(editing), body) : adminApi.createEvent(body)),
    onSuccess: () => { toast.success("Event saved"); setEditing(null); refresh(); },
    onError: onErr,
  });
  const del = useMutation({ mutationFn: adminApi.deleteEvent, onSuccess: () => { toast.success("Deleted"); refresh(); }, onError: onErr });
  const pub = useMutation({ mutationFn: adminApi.publishEvent, onSuccess: refresh, onError: onErr });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    save.mutate({
      title: f.title, description: f.description, venue: f.venue, date: f.date,
      time: f.time || null, image_url: f.image_url || null,
      capacity: Number(f.capacity || 100), price: Number(f.price || 0),
      registration_deadline: f.registration_deadline || null,
    });
  }

  const rows = (data ?? []).filter((e) => e.title);
  return (
    <div>
      <PageHeader title="Events" sub={`${rows.length} events`} action={<button className={btnCls} onClick={() => setEditing({})}><Plus className="h-4 w-4" />New event</button>} />
      <Panel className="overflow-x-auto p-0">
        {isLoading ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No events yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Event", "Date", "Venue", "Price", "Filled", "Status", ""].map((h) => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={idOf(e)} className="border-t border-border">
                  <td className="px-5 py-3 font-semibold">{str(e.title)}</td>
                  <td className="px-5 py-3">{fmtDate(e.date)}</td>
                  <td className="px-5 py-3">{str(e.venue, "—")}</td>
                  <td className="px-5 py-3">{fmtPrice(e.price)}</td>
                  <td className="px-5 py-3">{str(e.registered_count, "0")}/{str(e.capacity, "—")}</td>
                  <td className="px-5 py-3"><button onClick={() => pub.mutate(idOf(e))}><Pill ok={!!e.is_published}>{e.is_published ? "Published" : "Draft"}</Pill></button></td>
                  <td className="px-5 py-3 text-right">
                    <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => setEditing(e)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button className="p-2 text-destructive" onClick={() => confirm("Delete this event?") && del.mutate(idOf(e))} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="admin-theme max-w-lg bg-card text-foreground">
          <DialogHeader><DialogTitle>{editing && idOf(editing) ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <input name="title" required defaultValue={str(editing.title)} placeholder="Title" className={`${fieldCls} col-span-2`} />
              <textarea name="description" required defaultValue={str(editing.description)} placeholder="Description" rows={3} className={`${fieldCls} col-span-2`} />
              <input name="venue" required defaultValue={str(editing.venue)} placeholder="Venue" className={fieldCls} />
              <input name="date" type="date" required defaultValue={str(editing.date)} className={fieldCls} />
              <input name="time" defaultValue={str(editing.time)} placeholder="Time (e.g. 19:00)" className={fieldCls} />
              <input name="registration_deadline" type="date" defaultValue={str(editing.registration_deadline)} className={fieldCls} />
              <input name="capacity" type="number" defaultValue={str(editing.capacity, "100")} placeholder="Capacity" className={fieldCls} />
              <input name="price" type="number" step="0.01" defaultValue={str(editing.price, "0")} placeholder="Price" className={fieldCls} />
              <input name="image_url" defaultValue={str(editing.image_url)} placeholder="Image URL" className={`${fieldCls} col-span-2`} />
              <button disabled={save.isPending} className={`${btnCls} col-span-2 justify-center`}>{save.isPending ? "Saving…" : "Save event"}</button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
