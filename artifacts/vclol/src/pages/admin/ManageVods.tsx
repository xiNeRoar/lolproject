import AdminLayout from "@/components/layout/AdminLayout";
import { useListVods, useListEvents, useCreateVod, useUpdateVod, useDeleteVod } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

export default function ManageVods() {
  const { data: vods, isLoading } = useListVods();
  const { data: events } = useListEvents();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreateVod();
  const updateMut = useUpdateVod();
  const deleteMut = useDeleteVod();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ eventId: "" });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (vod: any) => {
    reset({ ...vod, eventId: vod.eventId || "" });
    setEditingId(vod.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = { ...data, eventId: data.eventId ? Number(data.eventId) : null };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ['/api/vods'] }); }
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ['/api/vods'] }); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this VOD?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/vods'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage VODs</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add VOD</Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Title / Event</th>
              <th className="px-6 py-3">URL</th>
              <th className="px-6 py-3">Tags/Format</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : vods?.map((item) => (
              <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-6 py-4">
                  <div className="font-bold">{item.title}</div>
                  <div className="text-xs text-primary">{item.eventTitle || 'Independent'}</div>
                </td>
                <td className="px-6 py-4 truncate max-w-[200px] text-xs"><a href={item.videoUrl} target="_blank" className="hover:underline">{item.videoUrl}</a></td>
                <td className="px-6 py-4">
                  {item.format && <span className="mr-2 border px-1 rounded text-[10px]">{item.format}</span>}
                  {item.roleTag && <span className="border px-1 rounded text-[10px] bg-primary/10 text-primary border-primary/20">{item.roleTag}</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader><DialogTitle>{editingId ? "Edit VOD" : "Add VOD"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="VOD Title" {...register("title", {required: true})} />
          <Input placeholder="Video URL (YouTube/Twitch)" {...register("videoUrl", {required: true})} />
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("eventId")}>
            <option value="">No Event (Independent)</option>
            {events?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Format (e.g. Pro View, Full Match)" {...register("format")} />
            <Input placeholder="Role Tag (e.g. Jungle, Mid)" {...register("roleTag")} />
          </div>
          <Input placeholder="Player Names (comma separated)" {...register("playerNames")} />
          <Textarea placeholder="Notes" {...register("notes")} />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
