import AdminLayout from "@/components/layout/AdminLayout";
import { useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function ManageEvents() {
  const { data: events, isLoading } = useListEvents();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreateEvent();
  const updateMut = useUpdateEvent();
  const deleteMut = useDeleteEvent();

  const { register, handleSubmit, reset, setValue } = useForm();

  const openNew = () => {
    reset({ registrationStatus: 'open', format: '5v5' });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (event: any) => {
    reset(event);
    setEditingId(event.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, data }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/events'] });
        }
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/events'] });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this event?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/events'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Events</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Event</Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? "Loading..." : events?.map(event => (
          <div key={event.id} className="bg-card border border-border/50 p-6 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">{event.title} <span className="text-sm font-normal text-muted-foreground ml-2">({event.slug})</span></h3>
              <p className="text-sm text-muted-foreground mt-1">{formatDate(event.eventDate)} • {event.format} • Status: {event.registrationStatus}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(event)}><Edit className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="Event Title" {...register("title", {required: true})} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Slug (url-friendly)" {...register("slug", {required: true})} />
            <Input type="date" {...register("eventDate", {required: true})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <Input placeholder="Format (e.g. 5v5)" {...register("format", {required: true})} />
             <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...register("registrationStatus")}>
               <option value="open">Open</option>
               <option value="upcoming">Upcoming</option>
               <option value="closed">Closed</option>
               <option value="invite-only">Invite Only</option>
             </select>
          </div>
          <Textarea placeholder="Short Description (appears on cards)" {...register("shortDescription", {required: true})} />
          <Textarea placeholder="Full Description (Markdown allowed)" className="h-32" {...register("fullDescription")} />
          <Textarea placeholder="Rules Summary" {...register("rulesSummary")} />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save Event</Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
