import AdminLayout from "@/components/layout/AdminLayout";
import { useListMatches, useListEvents, useCreateMatch, useUpdateMatch, useDeleteMatch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

export default function ManageMatches() {
  const { data: matches, isLoading } = useListMatches();
  const { data: events } = useListEvents();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreateMatch();
  const updateMut = useUpdateMatch();
  const deleteMut = useDeleteMatch();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ eventId: "" });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (match: any) => {
    reset({
      ...match,
      eventId: match.eventId || ""
    });
    setEditingId(match.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      eventId: data.eventId ? Number(data.eventId) : null
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ['/api/matches'] }); }
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ['/api/matches'] }); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this match?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/matches'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Matches</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Match</Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Event / Format</th>
              <th className="px-6 py-3">Matchup</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">VOD</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : matches?.map((item) => (
              <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-6 py-4">
                  <div className="font-medium text-primary">{item.eventTitle || 'Independent'}</div>
                  <div className="text-xs text-muted-foreground">{item.format} • {item.matchTitle}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={item.winnerName === item.sideAName ? 'font-bold' : ''}>{item.sideAName}</span>
                  <span className="mx-2 text-muted-foreground text-xs">vs</span>
                  <span className={item.winnerName === item.sideBName ? 'font-bold' : ''}>{item.sideBName}</span>
                </td>
                <td className="px-6 py-4 font-display font-bold">{item.score || '-'}</td>
                <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[100px]">{item.vodUrl || 'No VOD'}</td>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit Match" : "Add Match"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("eventId")}>
            <option value="">No Event (Independent)</option>
            {events?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Match Title (e.g. Grand Finals)" {...register("matchTitle", {required: true})} />
            <Input placeholder="Format (e.g. BO3, BO5)" {...register("format")} />
          </div>
          <div className="grid grid-cols-2 gap-4 border p-4 rounded-md border-border/50 bg-muted/20">
            <Input placeholder="Side A Name" {...register("sideAName", {required: true})} />
            <Input placeholder="Side B Name" {...register("sideBName", {required: true})} />
            <Input placeholder="Winner Name" className="col-span-2" {...register("winnerName", {required: true})} />
            <Input placeholder="Score (e.g. 2-1)" className="col-span-2" {...register("score")} />
          </div>
          <Input placeholder="VOD URL (Optional)" {...register("vodUrl")} />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
